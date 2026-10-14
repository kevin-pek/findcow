import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://cow.kevinpek.com",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
      images: ["https://cow.kevinpek.com/opengraph-image"],
    },
    {
      url: "https://cow.kevinpek.com/archive",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];
}
