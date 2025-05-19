// This file would be saved as /src/app/api/foods/route.js

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Fetch all foods or filter by category
export async function GET(request) {
  try {
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const limit = searchParams.get("limit");
    const page = searchParams.get("page") || "1";
    const search = searchParams.get("search");

    const pageSize = limit ? parseInt(limit) : 10;
    const skip = (parseInt(page) - 1) * pageSize;

    // Build the where clause for filtering
    const where = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive", // Case-insensitive search
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.food.count({ where });

    // Get the foods with their media and variants
    const foods = await prisma.food.findMany({
      where,
      include: {
        media: true,
        variants: {
          include: {
            media: true,
          },
        },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });

    // Return the foods with pagination metadata
    return NextResponse.json(
      {
        data: foods,
        meta: {
          page: parseInt(page),
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching foods:", error);
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

// POST - Create a new food product
export async function POST(request) {
  try {
    // Parse the request body
    const body = await request.json();

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

    // Create the food item along with its related media and variants
    const newFood = await prisma.food.create({
      data: {
        name,
        category,
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : null,
        rating: rating ? Number(rating) : null,
        reviewCount: reviewCount ? Number(reviewCount) : 0,
        isNewArrival: Boolean(isNewArrival),
        stock: Number(stock || 0),
        unit: unit || "porsi",
        description: description || null,

        // Create related media records
        media: {
          create: media
            .filter((item) => item.url && item.url.trim() !== "") // Only create media with non-empty URLs
            .map((item) => ({
              type: item.type,
              url: item.url,
              caption: item.caption || null,
              thumbnail: item.thumbnail || null,
            })),
        },

        // Create related variant records
        variants: {
          create: variants
            .filter((variant) => variant.name && variant.name.trim() !== "") // Only create variants with non-empty names
            .map((variant) => ({
              name: variant.name,
              price: Number(variant.price),
              discountPrice: variant.discountPrice
                ? Number(variant.discountPrice)
                : null,
              stock: Number(variant.stock || 0),
              description: variant.description || null,
              thumbnail: variant.thumbnail || null,

              // Create related media records for this variant
              media:
                variant.media && variant.media.length > 0
                  ? {
                      create: variant.media
                        .filter((item) => item.url && item.url.trim() !== "")
                        .map((item) => ({
                          type: item.type,
                          url: item.url,
                          caption: item.caption || null,
                          thumbnail: item.thumbnail || null,
                        })),
                    }
                  : undefined,
            })),
        },
      },
      // Include the created relations in the response
      include: {
        media: true,
        variants: {
          include: {
            media: true,
          },
        },
      },
    });

    // Return the created food with status 201 (Created)
    return NextResponse.json(newFood, { status: 201 });
  } catch (error) {
    console.error("Error creating food:", error);

    // Handle Prisma-specific errors
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          message: "Produk dengan nama yang sama sudah ada",
        },
        { status: 400 }
      );
    }

    // Return a generic error message
    return NextResponse.json(
      {
        message: "Terjadi kesalahan saat menyimpan produk",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  } finally {
    // Disconnect from the Prisma client to prevent connection leaks
    await prisma.$disconnect();
  }
}
