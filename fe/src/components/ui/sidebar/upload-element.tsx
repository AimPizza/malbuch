"use client";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "../dialog";
import { Input } from "../input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { format, formatISO } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../form";
import { UploadIcon } from "../icons/upload";
import { Button } from "../button";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Calendar } from "../calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "../separator";
import { toast } from "sonner";
import { useState } from "react";
import { API_URL } from "@/lib/network-utils";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

interface Props {
  onUploaded: () => void;
}

function UploadElement({ onUploaded }: Props) {
  const [open, setOpen] = useState<boolean>();

  const formSchema = z.object({
    file: z.file().max(MAX_UPLOAD_SIZE_BYTES),
    title: z.string().min(1).max(80),
    creationDate: z.date(),
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      creationDate: new Date(),
    },
  });

  const formSubmit = async (
    values: z.infer<typeof formSchema>,
    e?: React.BaseSyntheticEvent,
  ) => {
    if (e) e.preventDefault(); // Prevent page reload

    const formData = new FormData();
    formData.append("file", values.file);
    formData.append("title", values.title);
    formData.append("creationDate", formatISO(values.creationDate));

    try {
      await fetch(`${API_URL}/image`, {
        method: "POST",
        body: formData,
      });
      toast("Uploaded!");
      form.reset();
      onUploaded?.();
      setOpen(false);
    } catch (e) {
      toast.error("Failed");
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <UploadIcon className="icon-btn" />
      </DialogTrigger>
      <DialogContent className="bg-brand-alt border-brand h-max">
        <DialogHeader>Upload</DialogHeader>
        <div>
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit(formSubmit)(e);
              }}
              className="flex flex-col"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="something creative.."
                        type="text"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription></FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-row items-stretch gap-2">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="file"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>File</FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            className="bg-brand-bg h-30 border-brand cursor-pointer"
                            onChange={(e) =>
                              field.onChange(
                                e.target.files && e.target.files[0],
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex items-stretch">
                  <Separator
                    orientation="vertical"
                    className="bg-black mb-2 mt-2"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <FormField
                    control={form.control}
                    name="creationDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Created on</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="bg-brand-alt w-auto p-0"
                            align="start"
                          >
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() ||
                                date < new Date("1900-01-01")
                              }
                              captionLayout="dropdown"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" variant="submit" className="h-max">
                    Submit
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { UploadElement };
