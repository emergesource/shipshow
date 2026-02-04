"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { regenerateMessage, deleteMessage } from "@/app/protected/messages/actions";
import { Loader2, Copy, RotateCw, Trash2, Check } from "lucide-react";

interface MessageCardProps {
  message: {
    id: string;
    text: string;
    channels: {
      id: string;
      name: string;
      character_limit: number | null;
    };
  };
}

export function MessageCard({ message }: MessageCardProps) {
  const router = useRouter();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  async function handleRegenerate() {
    setIsRegenerating(true);
    setError(null);

    const result = await regenerateMessage(message.id);

    if (result?.error) {
      setError(result.error);
    } else {
      router.refresh();
    }

    setIsRegenerating(false);
  }

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);
    setError(null);

    const result = await deleteMessage(message.id);

    if (result?.error) {
      setError(result.error);
      setIsDeleting(false);
      setDeleteConfirm(false);
    } else {
      router.refresh();
    }
  }

  const isOverLimit = message.channels.character_limit &&
    message.text.length > message.channels.character_limit;

  return (
    <Card className="p-5">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-mono font-semibold">{message.channels.name}</h4>
              {message.channels.character_limit && (
                <span
                  className={`text-xs font-mono ${
                    isOverLimit ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {message.text.length}/{message.channels.character_limit}
                </span>
              )}
            </div>
            {isOverLimit && (
              <p className="text-xs text-destructive">
                Message exceeds character limit
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
              disabled={isRegenerating || isDeleting}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating || isDeleting}
            >
              {isRegenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCw className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant={deleteConfirm ? "destructive" : "outline"}
              size="sm"
              onClick={handleDelete}
              disabled={isRegenerating || isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Message Text */}
        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
          {message.text}
        </p>

        {error && (
          <div className="text-sm text-destructive">
            {error}
          </div>
        )}

        {deleteConfirm && (
          <p className="text-sm text-muted-foreground">
            Click delete again to confirm
          </p>
        )}
      </div>
    </Card>
  );
}
