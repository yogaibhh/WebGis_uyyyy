import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MapContainer,
  TileLayer,
  Polygon,
  CircleMarker,
  Tooltip as LeafletTooltip,
  useMap,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
  PlusCircle,
  BarChart2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend,
} from "recharts";

// Types
type LatLng = [number, number];
interface Kabupaten {
  id: string;
  name: string;
  coord: LatLng; // [lat, lng]
  selaras?: number; // program selaras
  tidakSelaras?: number; // program tidak selaras
  potensi?: string;
  catatan?: string;
}
interface Province {
  id: string;
  name: string;
  polygon: LatLng[]; // simplified polygon
  kabupaten: Kabupaten[];
  islandId: string;
}
interface Island {
  id: string;
  name: string;
  polygon: LatLng[];
}

type Level = "island" | "province" | "kabupaten";

// Palette (matches Tailwind CSS vars):
const COLORS = {
  primary: "#1a5f4f",
  secondary: "#6bb6b0",
  success: "#22c55e", // Tailwind green-500
  warning: "#f59e0b", // amber-500
  gray: "#9ca3af",
};

// Dummy simplified geo + data
// Polygons are very rough bounding shapes for demo purposes only.
const ISLANDS: Island[] = [
  {
    id: "sumatera",
    name: "Sumatera",
    polygon: [
      [5.8, 95.0],
      [5.8, 105.0],
      [-6.0, 105.0],
      [-6.0, 95.0],
    ],
  },
  {
    id: "jawa",
    name: "Jawa",
    polygon: [
      [-5.5, 105.0],
      [-5.5, 114.6],
      [-8.5, 114.6],
      [-8.5, 105.0],
    ],
  },
  {
    id: "kalimantan",
    name: "Kalimantan",
    polygon: [
      [3.5, 108.0],
      [3.5, 119.0],
      [-3.0, 119.0],
      [-3.0, 108.0],
    ],
  },
  {
    id: "sulawesi",
    name: "Sulawesi",
    polygon: [
      [1.5, 120.0],
      [1.5, 125.6],
      [-5.5, 125.6],
      [-5.5, 120.0],
    ],
  },
  {
    id: "papua",
    name: "Papua",
    polygon: [
      [-1.5, 134.0],
      [-1.5, 141.0],
      [-9.0, 141.0],
      [-9.0, 134.0],
    ],
  },
];

// Provinces (subset demo), polygons roughly within island bounds
const PROVINCES: Province[] = [
  // Jawa
  {
    id: "jabar",
    islandId: "jawa",
    name: "Jawa Barat",
    polygon: [
      [-5.9, 106.0],
      [-5.9, 108.8],
      [-7.2, 108.8],
      [-7.2, 106.0],
    ],
    kabupaten: [
      {
        id: "bandung",
        name: "Kab. Bandung",
        coord: [-6.95, 107.6],
        selaras: 18,
        tidakSelaras: 6,
        potensi: "Tekstil & Manufaktur",
        catatan: "Perlu sinkronisasi lintas sektor.",
      },
      {
        id: "bekasi",
        name: "Kab. Bekasi",
        coord: [-6.25, 107.2],
        selaras: 12,
        tidakSelaras: 10,
        potensi: "Manufaktur & Logistik",
      },
      {
        id: "tasik",
        name: "Kab. Tasikmalaya",
        coord: [-7.35, 108.2],
        potensi: "Agroforestri",
      },
    ],
  },
  {
    id: "jakarta",
    islandId: "jawa",
    name: "DKI Jakarta",
    polygon: [
      [-6.05, 106.6],
      [-6.05, 107.1],
      [-6.35, 107.1],
      [-6.35, 106.6],
    ],
    kabupaten: [
      {
        id: "jakpus",
        name: "Kota Jakarta Pusat",
        coord: [-6.19, 106.83],
        selaras: 22,
        tidakSelaras: 4,
        potensi: "Jasa Keuangan",
      },
      {
        id: "jakut",
        name: "Kota Jakarta Utara",
        coord: [-6.13, 106.86],
        selaras: 9,
        tidakSelaras: 11,
        potensi: "Pelabuhan & Logistik",
      },
    ],
  },
  {
    id: "jateng",
    islandId: "jawa",
    name: "Jawa Tengah",
    polygon: [
      [-6.2, 108.8],
      [-6.2, 111.2],
      [-7.6, 111.2],
      [-7.6, 108.8],
    ],
    kabupaten: [
      {
        id: "semarang",
        name: "Kab. Semarang",
        coord: [-7.05, 110.4],
        selaras: 14,
        tidakSelaras: 5,
        potensi: "Industri & Pariwisata",
      },
      {
        id: "surakarta",
        name: "Kota Surakarta",
        coord: [-7.56, 110.82],
        selaras: 10,
        tidakSelaras: 9,
        potensi: "UMKM Kreatif",
      },
      {
        id: "magelang",
        name: "Kab. Magelang",
        coord: [-7.47, 110.22],
        potensi: "Pariwisata & Pertanian",
      },
    ],
  },
  // Sumatera
  {
    id: "sumut",
    islandId: "sumatera",
    name: "Sumatera Utara",
    polygon: [
      [3.8, 97.0],
      [3.8, 100.0],
      [1.0, 100.0],
      [1.0, 97.0],
    ],
    kabupaten: [
      {
        id: "medan",
        name: "Kota Medan",
        coord: [3.59, 98.67],
        selaras: 13,
        tidakSelaras: 3,
        potensi: "Perdagangan",
      },
      {
        id: "deliserdang",
        name: "Kab. Deli Serdang",
        coord: [3.48, 98.86],
        selaras: 7,
        tidakSelaras: 12,
        potensi: "Pertanian & Industri",
      },
    ],
  },
  {
    id: "riau",
    islandId: "sumatera",
    name: "Riau",
    polygon: [
      [1.5, 100.5],
      [1.5, 104.0],
      [-0.5, 104.0],
      [-0.5, 100.5],
    ],
    kabupaten: [
      {
        id: "pekanbaru",
        name: "Kota Pekanbaru",
        coord: [0.51, 101.45],
        selaras: 8,
        tidakSelaras: 6,
        potensi: "Perkebunan & Migas",
      },
      {
        id: "siak",
        name: "Kab. Siak",
        coord: [0.8, 102.03],
        potensi: "Perkebunan",
      },
    ],
  },
  // Kalimantan
  {
    id: "kaltim",
    islandId: "kalimantan",
    name: "Kalimantan Timur",
    polygon: [
      [1.8, 116.0],
      [1.8, 118.8],
      [-0.8, 118.8],
      [-0.8, 116.0],
    ],
    kabupaten: [
      {
        id: "balikpapan",
        name: "Kota Balikpapan",
        coord: [-1.27, 116.83],
        selaras: 6,
        tidakSelaras: 9,
        potensi: "Migas & Logistik",
      },
      {
        id: "samarinda",
        name: "Kota Samarinda",
        coord: [-0.5, 117.15],
        selaras: 9,
        tidakSelaras: 8,
        potensi: "Perdagangan & Jasa",
      },
    ],
  },
  // Sulawesi
  {
    id: "sulsel",
    islandId: "sulawesi",
    name: "Sulawesi Selatan",
    polygon: [
      [-2.0, 119.5],
      [-2.0, 121.2],
      [-5.2, 121.2],
      [-5.2, 119.5],
    ],
    kabupaten: [
      {
        id: "makassar",
        name: "Kota Makassar",
        coord: [-5.14, 119.41],
        selaras: 15,
        tidakSelaras: 7,
        potensi: "Perdagangan & Maritim",
      },
      {
        id: "gowa",
        name: "Kab. Gowa",
        coord: [-5.2, 119.75],
        potensi: "Pertanian & Pariwisata",
      },
    ],
  },
  // Papua
  {
    id: "papua-tengah",
    islandId: "papua",
    name: "Papua Tengah",
    polygon: [
      [-2.5, 136.0],
      [-2.5, 138.5],
      [-4.8, 138.5],
      [-4.8, 136.0],
    ],
    kabupaten: [
      {
        id: "jayapura",
        name: "Kab. Jayapura",
        coord: [-2.53, 140.72],
        selaras: 5,
        tidakSelaras: 12,
        potensi: "Perikanan & Kehutanan",
        catatan: "Perlu percepatan sinkronisasi RPJMN.",
      },
      {
        id: "nabire",
        name: "Kab. Nabire",
        coord: [-3.36, 135.5],
        potensi: "Perikanan",
      },
    ],
  },
];

function polygonToBounds(poly: LatLng[]): [[number, number], [number, number]] {
  let minLat = 90,
    maxLat = -90,
    minLng = 180,
    maxLng = -180;
  for (const [lat, lng] of poly) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

function useStatusColor(k: Kabupaten) {
  const s = k.selaras ?? 0;
  const t = k.tidakSelaras ?? 0;
  if (s === 0 && t === 0) return COLORS.gray;
  return s >= t ? COLORS.success : COLORS.warning;
}

function FitBounds({
  bounds,
}: {
  bounds?: [[number, number], [number, number]];
}) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      try {
        map.flyToBounds(bounds as any, {
          duration: 0.9,
          paddingTopLeft: [20, 20],
          paddingBottomRight: [20, 20],
        });
      } catch {}
    }
  }, [bounds, map]);
  return null;
}

export default function WebGISDashboard() {
  // App state
  const [level, setLevel] = useState<Level>("island");
  const [selectedIslandId, setSelectedIslandId] = useState<string | null>(null);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKab, setEditingKab] = useState<Kabupaten | null>(null);
  const [form, setForm] = useState({
    selaras: "",
    tidakSelaras: "",
    potensi: "",
    catatan: "",
  });

  // Open modal helper
  const openModal = (kab: Kabupaten) => {
    setEditingKab(kab);
    setForm({
      selaras: kab.selaras?.toString() ?? "",
      tidakSelaras: kab.tidakSelaras?.toString() ?? "",
      potensi: kab.potensi ?? "",
      catatan: kab.catatan ?? "",
    });
    setModalOpen(true);
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    if (modalOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  // Derived data
  const island = useMemo(
    () => ISLANDS.find((i) => i.id === selectedIslandId) || null,
    [selectedIslandId],
  );
  const provincesInIsland = useMemo(
    () =>
      PROVINCES.filter(
        (p) => !selectedIslandId || p.islandId === selectedIslandId,
      ),
    [selectedIslandId],
  );
  const province = useMemo(
    () => PROVINCES.find((p) => p.id === selectedProvinceId) || null,
    [selectedProvinceId],
  );

  const kabList = useMemo(() => {
    const list = province?.kabupaten ?? [];
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter((k) => k.name.toLowerCase().includes(s));
  }, [province, search]);

  const currentBounds = useMemo(() => {
    if (level === "island" && island) return polygonToBounds(island.polygon);
    if (level !== "island" && province)
      return polygonToBounds(province.polygon);
    return undefined;
  }, [level, island, province]);

  const resetToIslands = () => {
    setLevel("island");
    setSelectedIslandId(null);
    setSelectedProvinceId(null);
  };

  // Update province data on submit (in-memory)
  const saveForm = () => {
    if (!editingKab || !province) return;
    const idxProv = PROVINCES.findIndex((p) => p.id === province.id);
    if (idxProv < 0) return;
    const idxKab = PROVINCES[idxProv].kabupaten.findIndex(
      (k) => k.id === editingKab.id,
    );
    if (idxKab < 0) return;
    const s = form.selaras ? parseInt(form.selaras, 10) : undefined;
    const t = form.tidakSelaras ? parseInt(form.tidakSelaras, 10) : undefined;
    PROVINCES[idxProv].kabupaten[idxKab] = {
      ...PROVINCES[idxProv].kabupaten[idxKab],
      selaras: s,
      tidakSelaras: t,
      potensi: form.potensi || undefined,
      catatan: form.catatan || undefined,
    };
    setModalOpen(false);
  };

  // Simple aggregates for chart
  const chartData = useMemo(() => {
    const rows = (province?.kabupaten ?? []).map((k) => ({
      name: k.name.replace(/^Kab\.|Kota\s/, ""),
      Selaras: k.selaras ?? 0,
      "Tidak Selaras": k.tidakSelaras ?? 0,
    }));
    return rows;
  }, [province]);

  // UI helpers
  const breadcrumb = (
    <div className="flex items-center gap-2 text-sm text-foreground/80">
      <button
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-secondary/30 transition",
        )}
        onClick={resetToIslands}
      >
        Indonesia
      </button>
      {island && (
        <>
          <ChevronRight className="h-4 w-4 opacity-60" />
          <button
            className="px-2 py-1 rounded-md hover:bg-secondary/30"
            onClick={() => {
              setLevel("province");
              setSelectedProvinceId(null);
            }}
          >
            {island.name}
          </button>
        </>
      )}
      {province && (
        <>
          <ChevronRight className="h-4 w-4 opacity-60" />
          <span className="px-2 py-1 rounded-md bg-secondary/20">
            {province.name}
          </span>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white to-secondary/10">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary text-white grid place-items-center font-bold">
              ID
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                WebGIS Dashboard RPJPN/RPJMN/RPPLH
              </h1>
              <p className="text-xs text-muted-foreground">
                Monitoring keselarasan program pembangunan • Nasional
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="outline"
              className="border-primary/30 text-primary"
            >
              <BarChart2 className="h-4 w-4" />
              Ringkasan
            </Button>
            <Button className="bg-primary hover:bg-primary/90">
              Publikasikan
            </Button>
          </div>
        </div>
        <div className="container py-2">{breadcrumb}</div>
      </header>

      {/* Main content */}
      <main className="container grid grid-cols-1 md:grid-cols-[1.8fr_1fr] gap-4 py-4">
        {/* Map */}
        <section className="relative rounded-xl overflow-hidden border bg-white">
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
            {level !== "island" && (
              <Button
                variant="secondary"
                className="bg-white/90 hover:bg-white text-foreground shadow"
                onClick={() => {
                  if (level === "kabupaten") {
                    setLevel("province");
                    setSelectedProvinceId(null);
                  } else {
                    setLevel("island");
                    setSelectedIslandId(null);
                    setSelectedProvinceId(null);
                  }
                }}
              >
                <ChevronLeft className="h-4 w-4" /> Kembali
              </Button>
            )}
          </div>

          <MapContainer
            center={[-2.5, 117]}
            zoom={5}
            minZoom={3}
            className="h-[60vh] md:h-[68vh]"
            zoomControl={true}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Fit to current selection */}
            <FitBounds bounds={currentBounds} />

            {/* Island polygons (only at island level) */}
            {level === "island" &&
              ISLANDS.map((i) => (
                <Polygon
                  key={i.id}
                  positions={i.polygon as LatLngExpression[]}
                  pathOptions={{
                    color: COLORS.primary,
                    weight: 2,
                    fillColor: COLORS.secondary,
                    fillOpacity: 0.15,
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedIslandId(i.id);
                      setLevel("province");
                    },
                  }}
                />
              ))}

            {/* Province polygons (at province and kabupaten levels) */}
            {provincesInIsland.map((p) => (
              <Polygon
                key={p.id}
                positions={p.polygon as LatLngExpression[]}
                pathOptions={{
                  color:
                    p.id === selectedProvinceId
                      ? COLORS.primary
                      : COLORS.secondary,
                  weight: p.id === selectedProvinceId ? 3 : 1.5,
                  fillColor: COLORS.secondary,
                  fillOpacity: 0.08,
                }}
                eventHandlers={{
                  click: () => {
                    setSelectedProvinceId(p.id);
                    setLevel("kabupaten");
                  },
                }}
              />
            ))}

            {/* Kabupaten markers (only when province selected) */}
            {level === "kabupaten" &&
              province &&
              province.kabupaten.map((k) => (
                <CircleMarker
                  key={k.id}
                  center={k.coord as LatLngExpression}
                  radius={8}
                  pathOptions={{
                    color: "#fff",
                    weight: 2,
                    fillColor: useStatusColor(k),
                    fillOpacity: 0.9,
                  }}
                  eventHandlers={{
                    click: () => openModal(k),
                  }}
                >
                  <LeafletTooltip direction="top">
                    <div className="space-y-1">
                      <div className="font-medium">{k.name}</div>
                      <div className="text-xs">
                        Selaras: {k.selaras ?? 0} • Tidak: {k.tidakSelaras ?? 0}
                      </div>
                    </div>
                  </LeafletTooltip>
                </CircleMarker>
              ))}
          </MapContainer>
        </section>

        {/* Right panel */}
        <aside className="rounded-xl border bg-white p-3 md:p-4 flex flex-col gap-3 md:gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base md:text-lg font-semibold">
                {level === "island" && "Pilih Pulau"}
                {level === "province" &&
                  (island ? `Provinsi di ${island.name}` : "Pilih Provinsi")}
                {level === "kabupaten" &&
                  (province ? `Kab/Kota • ${province.name}` : "Kab/Kota")}
              </h2>
              <p className="text-xs text-muted-foreground">
                Klik di peta atau pilih dari daftar
              </p>
            </div>
          </div>

          {level === "kabupaten" && (
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Cari kabupaten/kota..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          <div className="flex-1 overflow-auto pr-1">
            {level === "island" && (
              <ul className="space-y-2">
                {ISLANDS.map((i) => (
                  <li key={i.id}>
                    <button
                      className="w-full flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-secondary/20 transition"
                      onClick={() => {
                        setSelectedIslandId(i.id);
                        setLevel("province");
                      }}
                    >
                      <span className="font-medium">{i.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {level === "province" && (
              <ul className="space-y-2">
                {provincesInIsland.map((p) => (
                  <li key={p.id}>
                    <button
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left hover:bg-secondary/20 transition",
                        p.id === selectedProvinceId && "ring-2 ring-primary/30",
                      )}
                      onClick={() => {
                        setSelectedProvinceId(p.id);
                        setLevel("kabupaten");
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{p.name}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="mt-1 flex gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded bg-success/15 text-success px-2 py-0.5">
                          OK
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-warning/15 text-warning px-2 py-0.5">
                          Perlu perhatian
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {level === "kabupaten" && (
              <ul className="space-y-2">
                {kabList.map((k) => {
                  const color = useStatusColor(k);
                  return (
                    <li key={k.id}>
                      <button
                        className="w-full rounded-lg border px-3 py-2 text-left hover:bg-secondary/20 transition"
                        onClick={() => openModal(k)}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2">
                              {k.name}
                              <span className="text-xs text-muted-foreground">
                                ({k.selaras ?? 0}/{k.tidakSelaras ?? 0})
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {k.potensi ?? "Belum ada potensi"}
                            </div>
                          </div>
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {level === "kabupaten" && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="border-primary/30 text-primary"
                onClick={() => setSearch("")}
              >
                Bersihkan
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() =>
                  province &&
                  province.kabupaten[0] &&
                  openModal(province.kabupaten[0])
                }
              >
                <PlusCircle className="h-4 w-4" /> Input Data
              </Button>
            </div>
          )}
        </aside>
      </main>

      {/* Chart section */}
      <section className="container pb-8">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              Perbandingan Program per Kab/Kota{" "}
              {province ? `• ${province.name}` : ""}
            </h3>
            <div className="text-xs text-muted-foreground">
              Selaras vs Tidak Selaras
            </div>
          </div>
          <div className="h-64 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: 12, right: 12 }}>
                <XAxis
                  dataKey="name"
                  hide={chartData.length > 8}
                  tick={{ fontSize: 12 }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Legend />
                <ReTooltip />
                <Bar dataKey="Selaras" stackId="a" fill={COLORS.success} />
                <Bar
                  dataKey="Tidak Selaras"
                  stackId="a"
                  fill={COLORS.warning}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Modal (z-[9999], full overlay, centered, scrollable) */}
      {modalOpen && editingKab && (
        <div className="fixed inset-0 z-[9999]">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />

          {/* Dialog */}
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl border max-h-[85vh] overflow-hidden">
              <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b bg-white/90 backdrop-blur">
                <div className="flex items-center gap-2">
                  <span className="h-8 w-8 rounded-lg bg-primary text-white grid place-items-center font-semibold">
                    D
                  </span>
                  <div>
                    <div className="font-semibold">
                      Input Data DPSIR - {editingKab.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Update data keselarasan program
                    </div>
                  </div>
                </div>
                <button
                  className="p-2 rounded-md hover:bg-secondary/30"
                  aria-label="Tutup"
                  onClick={() => setModalOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-5 py-4 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">
                      Program Selaras
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={form.selaras}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, selaras: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Program Tidak Selaras
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={form.tidakSelaras}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, tidakSelaras: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Potensi Utama</label>
                  <input
                    type="text"
                    placeholder="contoh: Perikanan, Agroforestri, Pariwisata"
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.potensi}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, potensi: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Catatan</label>
                  <textarea
                    rows={4}
                    className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.catatan}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, catatan: e.target.value }))
                    }
                  />
                </div>

                {/* Preview ringkas */}
                <div className="rounded-lg border p-3 bg-secondary/10">
                  <div className="text-sm font-semibold mb-2">Preview</div>
                  <div className="text-sm grid grid-cols-2 gap-2">
                    <div>Selaras: {form.selaras || 0}</div>
                    <div>Tidak Selaras: {form.tidakSelaras || 0}</div>
                    <div className="col-span-2">
                      Potensi: {form.potensi || "-"}
                    </div>
                    <div className="col-span-2">
                      Catatan: {form.catatan || "-"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white/90 backdrop-blur px-5 py-3 border-t flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  className="border-primary/30"
                  onClick={() => setModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={saveForm}
                >
                  Simpan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} WebGIS Dashboard • RPJPN/RPJMN/RPPLH
      </footer>
    </div>
  );
}
