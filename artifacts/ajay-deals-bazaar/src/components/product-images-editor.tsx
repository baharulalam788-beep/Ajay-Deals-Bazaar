import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, LoaderCircle, RotateCcw, X } from "lucide-react";
import { useUploadProductImage } from "@workspace/api-client-react";

type GalleryImage = {
  id: string;
  preview: string;
  url?: string;
  file?: File;
  status: "uploaded" | "uploading" | "error";
};

type Props = {
  productId: string;
  images: string[];
  onChange: (images: string[]) => void;
  onReadyChange: (ready: boolean) => void;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read the selected image."));
    };
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

export function ProductImagesEditor({ productId, images, onChange, onReadyChange }: Props) {
  const upload = useUploadProductImage({ request: { credentials: "same-origin" } });
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<GalleryImage[]>([]);
  const dragIndex = useRef<number | null>(null);
  const [items, setItems] = useState<GalleryImage[]>(() => (
    images.slice(0, 15).map((url, index) => ({
      id: `saved-${index}-${url}`,
      preview: url,
      url,
      status: "uploaded",
    }))
  ));
  const [notice, setNotice] = useState("");

  itemsRef.current = items;

  useEffect(() => () => {
    for (const item of itemsRef.current) {
      if (!item.url && item.preview.startsWith("blob:")) URL.revokeObjectURL(item.preview);
    }
  }, []);

  const updateItems = (transform: (current: GalleryImage[]) => GalleryImage[]) => {
    const next = transform(itemsRef.current);
    itemsRef.current = next;
    setItems(next);
    onChange(next.flatMap((item) => item.url ? [item.url] : []));
    onReadyChange(next.every((item) => Boolean(item.url)));
  };

  const uploadItem = async (item: GalleryImage) => {
    if (!item.file) return;
    updateItems((current) => current.map((entry) => (
      entry.id === item.id ? { ...entry, status: "uploading" } : entry
    )));
    try {
      const imageData = await fileToDataUrl(item.file);
      const result = await upload.mutateAsync({
        id: productId,
        data: { imageData },
      });
      if (item.preview.startsWith("blob:")) URL.revokeObjectURL(item.preview);
      updateItems((current) => current.map((entry) => (
        entry.id === item.id
          ? { ...entry, preview: result.url, url: result.url, file: undefined, status: "uploaded" }
          : entry
      )));
    } catch {
      updateItems((current) => current.map((entry) => (
        entry.id === item.id ? { ...entry, status: "error" } : entry
      )));
    }
  };

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length) return;

    const remaining = Math.max(0, 15 - itemsRef.current.length);
    const accepted = files.slice(0, remaining).filter((file) => (
      ["image/png", "image/jpeg", "image/webp"].includes(file.type) && file.size <= 5 * 1024 * 1024
    ));
    if (remaining === 0) {
      setNotice("This product already has 15 images.");
      return;
    }
    if (files.length > remaining) setNotice(`Only ${remaining} more image${remaining === 1 ? "" : "s"} fit in this gallery.`);
    else if (accepted.length < files.length) setNotice("Use PNG, JPG, or WebP images up to 5 MB each.");
    else setNotice("");
    if (!accepted.length) return;

    const newItems = accepted.map((file) => ({
      id: `${Date.now()}-${crypto.randomUUID()}`,
      preview: URL.createObjectURL(file),
      file,
      status: "uploading" as const,
    }));
    updateItems((current) => [...current, ...newItems]);
    void (async () => {
      for (const item of newItems) await uploadItem(item);
    })();
  };

  const removeImage = (item: GalleryImage) => {
    if (item.status === "uploading") return;
    if (!item.url && item.preview.startsWith("blob:")) URL.revokeObjectURL(item.preview);
    updateItems((current) => current.filter((entry) => entry.id !== item.id));
  };

  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= itemsRef.current.length || from === to) return;
    updateItems((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const addedCount = items.filter((item) => item.url).length;
  const uploadingCount = items.filter((item) => item.status === "uploading").length;

  return (
    <section className="sm:col-span-2" data-testid="section-product-images">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="display text-sm font-semibold">Product Images (Up to 15 Photos)</h3>
          <p className="mt-1 text-xs text-[#75817b]">The first image is the main thumbnail. Drag to reorder.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#61716a]" data-testid="text-product-image-count">{addedCount}/15 images added</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={items.length >= 15 || upload.isPending}
            className="btn btn-soft !px-3 !py-2 text-xs"
            data-testid="button-add-product-images"
          >
            <ImagePlus size={15} /> Add More Images
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="sr-only"
            onChange={handleFiles}
            aria-label="Select product images"
            data-testid="input-product-images"
          />
        </div>
      </div>

      {notice && <p className="mt-3 rounded-lg bg-[#fff4db] px-3 py-2 text-xs text-[#775a1c]" role="status" data-testid="status-product-image-notice">{notice}</p>}
      {uploadingCount > 0 && <p className="mt-3 flex items-center gap-2 text-xs font-medium text-[#17675b]" role="status" data-testid="status-product-image-uploading"><LoaderCircle size={14} className="animate-spin" /> Uploading {uploadingCount} {uploadingCount === 1 ? "image" : "images"}…</p>}

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#cbd5cc] bg-[#f8f7f2] p-7 text-center">
          <ImagePlus className="mx-auto text-[#17675b]" size={24} />
          <p className="mt-2 text-sm font-semibold">No product images yet</p>
          <p className="mt-1 text-xs text-[#75817b]">Add up to 15 images for the product gallery.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable={item.status !== "uploading"}
              onDragStart={() => { dragIndex.current = index; }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex.current !== null) reorder(dragIndex.current, index);
                dragIndex.current = null;
              }}
              onDragEnd={() => { dragIndex.current = null; }}
              className={`group relative overflow-hidden rounded-xl border bg-white ${item.status === "error" ? "border-[#e3b9b0]" : "border-[#e2e7e1]"}`}
              data-testid={`tile-product-image-${index + 1}`}
            >
              <img src={item.preview} alt={`Product image preview ${index + 1}`} className="aspect-square w-full object-cover" />
              <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-[#42534a]">
                {index === 0 ? "Main" : `Slot ${index + 1}`}
              </span>
              <span className="absolute bottom-2 left-2 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white" aria-hidden="true">
                <GripVertical size={15} />
              </span>
              {item.status === "uploading" && (
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/65 px-2 py-2 text-[11px] font-semibold text-white">
                  <LoaderCircle size={13} className="animate-spin" /> Uploading
                </span>
              )}
              {item.status === "error" && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-[#7d352a]/90 px-2 py-2 text-[10px] font-semibold text-white">
                  <span>Upload failed</span>
                  <button type="button" onClick={() => void uploadItem(item)} className="inline-flex items-center gap-1 underline" data-testid={`button-retry-image-${index + 1}`}>
                    <RotateCcw size={12} /> Retry
                  </button>
                </div>
              )}
              <div className="absolute right-2 top-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => reorder(index, index - 1)}
                  disabled={index === 0 || item.status === "uploading"}
                  className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-[#35443c] disabled:opacity-40"
                  aria-label={`Move image ${index + 1} left`}
                  data-testid={`button-move-image-left-${index + 1}`}
                ><ChevronLeft size={15} /></button>
                <button
                  type="button"
                  onClick={() => reorder(index, index + 1)}
                  disabled={index === items.length - 1 || item.status === "uploading"}
                  className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-[#35443c] disabled:opacity-40"
                  aria-label={`Move image ${index + 1} right`}
                  data-testid={`button-move-image-right-${index + 1}`}
                ><ChevronRight size={15} /></button>
                <button
                  type="button"
                  onClick={() => removeImage(item)}
                  disabled={item.status === "uploading"}
                  className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-[#a64136] disabled:opacity-40"
                  aria-label={`Delete image ${index + 1}`}
                  data-testid={`button-delete-image-${index + 1}`}
                ><X size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
