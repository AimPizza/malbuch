import { format } from "date-fns";
import {
  BackgroundCard,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../background-card";
import type { ImageData } from "@/types/image";
import { DeletionElement } from "./deletion-element";
import { API_URL } from "@/lib/network-utils";

interface Props {
  onImgDeleted: () => void;
  imgData: ImageData;
}

function baseName(str: string): string {
  let base = new String(str).substring(str.lastIndexOf("/") + 1);
  if (base.lastIndexOf(".") != -1)
    base = base.substring(0, base.lastIndexOf("."));
  return base;
}

function formatDate(date: Date): string {
  return format(date, "PPP");
}

function ImageCard({ imgData, onImgDeleted }: Props) {
  const cdate = new Date(imgData.creation_date);
  const mdate = new Date(imgData.last_modified);

  const imageUrl = `${API_URL}/image/${imgData.file}`;

  return (
    <BackgroundCard className="w-5xl max-w-10/12 min-h-max group relative">
      <CardHeader>
        <CardTitle className="text-2xl ">
          {imgData.title || baseName(imgData.file)}
        </CardTitle>
        <CardDescription>
          <ul>
            <li>{"created: " + formatDate(cdate)}</li>
            <li>
              {cdate.getDate() !== mdate.getDate() &&
                "modified: " + formatDate(mdate)}
            </li>
          </ul>
        </CardDescription>
        <CardAction className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <DeletionElement imgData={imgData} onDeleted={onImgDeleted} />
        </CardAction>
      </CardHeader>

      <CardContent className="flex justify-center items-center">
        <img
          width={400}
          src={imageUrl}
          loading="lazy"
          alt={imgData.title || "Unnamed image"}
          style={{
            imageRendering: "pixelated",
          }}
        />
      </CardContent>
    </BackgroundCard>
  );
}

export { ImageCard };
