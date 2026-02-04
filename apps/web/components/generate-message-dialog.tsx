"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { generateMessage } from "@/app/protected/messages/actions";
import { Loader2, Plus } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  character_limit: number | null;
}

interface GenerateMessageDialogProps {
  summaryId: string;
  channels: Channel[];
  existingChannelIds: string[];
}

export function GenerateMessageDialog({
  summaryId,
  channels,
  existingChannelIds
}: GenerateMessageDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>("");

  // Filter out channels that already have messages
  const availableChannels = channels.filter(
    channel => !existingChannelIds.includes(channel.id)
  );

  async function handleGenerate() {
    if (!selectedChannel) return;

    setIsGenerating(true);
    setError(null);

    const result = await generateMessage(summaryId, selectedChannel);

    if (result?.error) {
      setError(result.error);
      setIsGenerating(false);
    } else {
      setOpen(false);
      setIsGenerating(false);
      setSelectedChannel("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" disabled={availableChannels.length === 0}>
          <Plus className="h-4 w-4" />
          Generate Message
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-mono">Generate Message</DialogTitle>
          <DialogDescription>
            Transform your summary for a specific channel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {availableChannels.length > 0 ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium font-mono">Channel</label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  disabled={isGenerating}
                  className="w-full p-3 rounded-md border border-input bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                >
                  <option value="">Select a channel</option>
                  {availableChannels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name}
                      {channel.character_limit && ` (max ${channel.character_limit} chars)`}
                    </option>
                  ))}
                </select>
                {selectedChannel && (
                  <p className="text-xs text-muted-foreground">
                    {availableChannels.find(c => c.id === selectedChannel)?.description}
                  </p>
                )}
              </div>

              {error && (
                <div className="text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!selectedChannel || isGenerating}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              You've already generated messages for all available channels.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
