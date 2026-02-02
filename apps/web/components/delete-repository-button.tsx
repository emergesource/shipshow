"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteRepository } from "@/app/protected/repositories/actions";
import { Loader2, Trash2 } from "lucide-react";

interface DeleteRepositoryButtonProps {
  repositoryId: string;
}

export function DeleteRepositoryButton({ repositoryId }: DeleteRepositoryButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    await deleteRepository(repositoryId);
    // Redirect handled by server action
  }

  if (!showConfirm) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirm(true)}
        className="text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>
    );
  }

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
