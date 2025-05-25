import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function WrapperSheet({
  trigger,
  title,
  description,
  children,
  submitLabel = "Submit",
  submitFunction,
  submitError,
  submitLoading,
  submitDelay = 1000,
  submitDisable = false,
  onClose,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  submitLabel: string;
  submitFunction: Function;
  submitError?: string;
  submitLoading?: boolean;
  submitDelay?: number;
  submitDisable?: boolean;
  onClose?: Function;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleOnOpenChange(open: boolean) {
    setSheetOpen(open);
    if (open == false && onClose) {
      onClose();
    }
  }

  async function handleSubmit() {
    const canClose = await submitFunction();
    if (canClose !== false) {
      setSheetOpen(false);
    }
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={handleOnOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : null}
        </SheetHeader>
        {children}
        <SheetFooter>
          <Label className="text-destructive">{submitError}</Label>
          <Button
            longPress={handleSubmit}
            longPressDelay={submitDelay}
            loading={submitLoading}
            disabled={submitLoading || submitDisable}
          >
            {submitLoading ? (
              <Loader2 className="animate-spin shrink-0" />
            ) : null}
            {submitLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
