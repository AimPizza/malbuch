import type { ImageData } from "@/types/image";

function getImgName(imgData: ImageData) {
  return imgData.title ? imgData.title : imgData.file;
}

export { getImgName };
