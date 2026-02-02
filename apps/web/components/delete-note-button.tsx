"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteNote } from "@/app/protected/notes/actions";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteNoteButtonProps {
  noteId: string;
}

export function DeleteNoteButton({ noteId }: DeleteNoteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    await deleteNote(noteId);
    // Redirect happens in the action
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="gap-2"
        >
          {isDeleting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              Confirm Delete
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowConfirm(true)}
      className="gap-2 text-destructive hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
      Delete Note
    </Button>
  );
}
