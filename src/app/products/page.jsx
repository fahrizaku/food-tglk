"use client";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import Image from "next/image";
import { dummyFoods } from "@/data/foodProducts";
import Link from "next/link";

// Fungsi untuk memformat harga
const formatPrice = (price) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

// Komponenen kartu makanan
const FoodCard = ({ food }) => {
  // Mendapatkan media utama (media pertama sebagai gambar utama)
  const getMainImage = () => {
    // Jika memiliki media array, gunakan URL dari media pertama jika itu gambar
    if (food.media && food.media.length > 0) {
      // Cari media pertama yang berupa gambar
      const firstImage = food.media.find((item) => item.type === "image");
      if (firstImage) {
        return firstImage.url;
      }
    }
    // Fallback ke placeholder jika media tidak ada atau tidak ada gambar
    return "/placeholder-image.jpg";
  };

  // Cek apakah memiliki video
  const hasVideo =
    food.media && food.media.some((item) => item.type === "video");

  return (
    <Link href={`/products/${food.id}`}>
      <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
        <div className="relative">
          <Image
            src={getMainImage()}
            alt={food.name}
            width={500}
            height={500}
            className="w-full h-40 object-cover"
            priority
          />
          {food.isNewArrival && (
            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-medium px-2 py-1 rounded">
              Menu Baru
            </div>
          )}
          {food.discountPrice && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded">
              {Math.round(
                ((food.price - food.discountPrice) / food.price) * 100
              )}
              % OFF
            </div>
          )}
        </div>

        <div className="p-3">
          <h3 className="font-medium text-gray-800 mb-2 line-clamp-2">
            {food.name}
          </h3>

          <div className="flex items-center mb-2">
            <div className="flex text-yellow-400">
              {"★".repeat(Math.floor(food.rating))}
              {"☆".repeat(5 - Math.floor(food.rating))}
            </div>
            <span className="text-xs text-gray-500 ml-1">
              ({food.reviewCount})
            </span>
          </div>

          <div className="mb-3">
            {food.stock <= 0 && (
              <div className="text-xs text-red-500 font-medium mb-1">
                Stok Habis
              </div>
            )}
            {food.discountPrice ? (
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 line-through">
                  {formatPrice(food.price)}
                </span>
                <span className="font-semibold text-red-600">
                  {formatPrice(food.discountPrice)}
                </span>
              </div>
            ) : (
              <span className="font-semibold text-gray-800">
                {formatPrice(food.price)}
              </span>
            )}
            <div className="text-xs text-gray-500">per {food.unit}</div>
          </div>
        </div>
      </div>
    </Link>
  );
};

// Halaman utama
export default function FoodPage() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    // Simulasi fetching data
    const fetchFoods = () => {
      setLoading(true);
      // Gunakan setTimeout untuk mensimulasikan network delay
      setTimeout(() => {
        setFoods(dummyFoods);
        setSearchResults(dummyFoods);
        setLoading(false);
      }, 1000);
    };

    fetchFoods();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();

    if (searchQuery.trim() === "") {
      setSearchResults(foods);
      return;
    }

    const search = searchQuery.toLowerCase();
    const results = foods.filter(
      (food) =>
        food.name.toLowerCase().includes(search) ||
        food.category.toLowerCase().includes(search)
    );

    setSearchResults(results);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">
        Kelezatan Sampai ke Rumah Anda
      </h1>
      <p className="text-xs md:text-sm text-gray-500 mb-4">
        Kami siap mengantarkan kelezatan langsung ke pintu rumah Anda
      </p>

      {/* Search Bar */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Cari menu makanan atau minuman..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 pl-10 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <button
            type="submit"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-orange-600 text-white px-3 py-1 rounded-md text-sm"
          >
            Cari
          </button>
        </form>
      </div>

      {/* Daftar Menu */}
      <div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 animate-pulse"
              >
                <div className="w-full h-40 bg-gray-200"></div>
                <div className="p-3">
                  <div className="h-2 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2 w-1/2"></div>
                  <div className="h-5 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : searchResults.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-2">Tidak ada menu yang ditemukan</p>
            <p className="text-sm text-gray-400">
              Coba ubah kata kunci pencarian
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500">
                Menampilkan {searchResults.length} menu
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {searchResults.map((food) => (
                <FoodCard key={food.id} food={food} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
