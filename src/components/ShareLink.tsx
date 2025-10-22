import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ShareLinkProps {
  gameId: string;
  shareLink: string;
}

export function ShareLink({ gameId, shareLink }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my HexaPath game!',
          text: `Let's play HexaPath! Game code: ${gameId}`,
          url: shareLink,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Share Game
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Game Code
          </p>
          <p className="text-2xl font-bold font-mono">{gameId}</p>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Share Link
          </p>
          <div className="flex gap-2">
            <Input value={shareLink} readOnly />
            <Button
              onClick={copyToClipboard}
              variant="secondary"
              size="icon"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {navigator.share && (
          <Button onClick={handleShare} className="w-full">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </CardContent>
    </Card>
  );
}