import { DialogTitle } from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "../dialog";
import { DeleteIcon } from "../icons/delete";
import type { ImageData } from "@/types/image";
import { getImgName } from "@/lib/img-utils";
import { Button } from "../button";
import { toast } from "sonner";
import { useState } from "react";
import { API_URL } from "@/lib/network-utils";

interface Props {
  imgData: ImageData;
  onDeleted: () => void;
}

function DeletionElement({ imgData, onDeleted }: Props) {
  const [open, setOpen] = useState<boolean>();

  const imgDeletion = async () => {
    try {
      const res = await fetch(`${API_URL}/image/${imgData.file}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const message = await res.text();
      toast.success(message);
      onDeleted();
    } catch (error) {
      console.error("Deletion failed:", error);
      toast.error("deletion failed!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <DeleteIcon className="icon-btn" />
      </DialogTrigger>
      <DialogContent className="bg-brand-alt border-brand h-max">
        <DialogHeader>
          <DialogTitle>
            Do you really want to delete the following content?
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>{getImgName(imgData)}</DialogDescription>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              await imgDeletion();
              setOpen(false);
            }}
            variant="destructive"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { DeletionElement };
