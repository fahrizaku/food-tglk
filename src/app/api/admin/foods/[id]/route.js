import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Fetch a single food by ID
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const foodId = parseInt(id);

    if (isNaN(foodId)) {
      return NextResponse.json(
        { message: "ID produk tidak valid" },
        { status: 400 }
      );
    }

    const food = await prisma.food.findUnique({
      where: { id: foodId },
      include: {
        media: true,
        variants: {
          include: {
            media: true,
          },
        },
      },
    });

    if (!food) {
      return NextResponse.json(
        { message: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    // Ensure minimum default values for UI consistency
    const processedFood = {
      ...food,
      unit: food.unit || "porsi",
      rating: food.rating || 0,
      reviewCount: food.reviewCount || 0,
      description: food.description || "-",
      variants: food.variants.map((variant) => ({
        ...variant,
        description: variant.description || "-",
        stock: variant.stock ?? 0,
      })),
    };

    return NextResponse.json(processedFood, { status: 200 });
  } catch (error) {
    console.error(`Error fetching food:`, error);
    return NextResponse.json(
      {
        message: "Terjadi kesalahan saat mengambil data produk",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Update a food by ID
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const foodId = parseInt(id);

    if (isNaN(foodId)) {
      return NextResponse.json(
        { message: "ID produk tidak valid" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Check if the food exists
    const existingFood = await prisma.food.findUnique({
      where: { id: foodId },
      include: {
        media: { select: { id: true } },
        variants: {
          include: {
            media: { select: { id: true } },
          },
        },
      },
    });

    if (!existingFood) {
      return NextResponse.json(
        { message: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    // Extract data from the request body
    const {
      name,
      category,
      price,
      discountPrice,
      rating,
      reviewCount,
      isNewArrival,
      stock,
      unit,
      description,
      media,
      variants,
    } = body;

    // Basic validation
    if (!name || !category || !price) {
      return NextResponse.json(
        {
          message: "Nama produk, kategori, dan harga harus diisi",
        },
        { status: 400 }
      );
    }

    // Validate media if provided
    if (media && !Array.isArray(media)) {
      return NextResponse.json(
        {
          message: "Media harus berupa array",
        },
        { status: 400 }
      );
    }

    // Validate variants if provided
    if (variants && !Array.isArray(variants)) {
      return NextResponse.json(
        {
          message: "Varian harus berupa array",
        },
        { status: 400 }
      );
    }

    // Start a transaction
    const updatedFood = await prisma.$transaction(async (tx) => {
      // 1. Delete existing media for this food (we'll replace them)
      await tx.media.deleteMany({
        where: { foodId },
      });

      // 2. For each variant, delete its media
      for (const variant of existingFood.variants) {
        await tx.media.deleteMany({
          where: { variantId: variant.id },
        });
      }

      // 3. Delete all variants of this food
      await tx.variant.deleteMany({
        where: { foodId },
      });

      // 4. Update the food itself
      const updated = await tx.food.update({
        where: { id: foodId },
        data: {
          name,
          category,
          price: Number(price),
          discountPrice: discountPrice ? Number(discountPrice) : null,
          rating: rating ? Number(rating) : 0,
          reviewCount: reviewCount ? Number(reviewCount) : 0,
          isNewArrival: Boolean(isNewArrival),
          stock: Number(stock || 0),
          unit: unit || "porsi",
          description: description || null,

          // Create new media records
          media: {
            create:
              media && Array.isArray(media)
                ? media
                    .filter((item) => item.url && item.url.trim() !== "")
                    .map((item) => ({
                      type: item.type || "image",
                      url: item.url,
                      caption: item.caption || null,
                      thumbnail: item.thumbnail || null,
                    }))
                : [],
          },

          // Create new variant records
          variants: {
            create:
              variants && Array.isArray(variants)
                ? variants
                    .filter(
                      (variant) => variant.name && variant.name.trim() !== ""
                    )
                    .map((variant) => ({
                      name: variant.name,
                      price: Number(variant.price || price),
                      discountPrice: variant.discountPrice
                        ? Number(variant.discountPrice)
                        : null,
                      stock: Number(variant.stock || 0),
                      description: variant.description || null,
                      thumbnail: variant.thumbnail || null,

                      // Create media records for this variant
                      media:
                        variant.media && variant.media.length > 0
                          ? {
                              create: variant.media
                                .filter(
                                  (item) => item.url && item.url.trim() !== ""
                                )
                                .map((item) => ({
                                  type: item.type || "image",
                                  url: item.url,
                                  caption: item.caption || null,
                                  thumbnail: item.thumbnail || null,
                                })),
                            }
                          : undefined,
                    }))
                : [],
          },
        },
        include: {
          media: true,
          variants: {
            include: {
              media: true,
            },
          },
        },
      });

      return updated;
    });

    // Ensure minimum default values for UI consistency
    const processedFood = {
      ...updatedFood,
      unit: updatedFood.unit || "porsi",
      rating: updatedFood.rating || 0,
      reviewCount: updatedFood.reviewCount || 0,
      description: updatedFood.description || "-",
      variants: updatedFood.variants.map((variant) => ({
        ...variant,
        description: variant.description || "-",
        stock: variant.stock ?? 0,
      })),
    };

    return NextResponse.json(processedFood, { status: 200 });
  } catch (error) {
    console.error(`Error updating food:`, error);
    return NextResponse.json(
      {
        message: "Terjadi kesalahan saat memperbarui produk",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Remove a food by ID
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const foodId = parseInt(id);

    if (isNaN(foodId)) {
      return NextResponse.json(
        { message: "ID produk tidak valid" },
        { status: 400 }
      );
    }

    // Check if the food exists
    const existingFood = await prisma.food.findUnique({
      where: { id: foodId },
    });

    if (!existingFood) {
      return NextResponse.json(
        { message: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    // Delete the food (this will cascade delete variants and media because of onDelete: Cascade in the schema)
    await prisma.food.delete({
      where: { id: foodId },
    });

    return NextResponse.json(
      { message: "Produk berhasil dihapus" },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error deleting food:`, error);
    return NextResponse.json(
      {
        message: "Terjadi kesalahan saat menghapus produk",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
