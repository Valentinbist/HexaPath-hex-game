import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GameModeSelectorProps {
  open: boolean;
  onClose: () => void;
  onLocalGame: () => void;
  onCreateOnline: () => void;
  onJoinOnline: (gameId: string) => void;
}

export function GameModeSelector({
  open,
  onClose,
  onLocalGame,
  onCreateOnline,
  onJoinOnline,
}: GameModeSelectorProps) {
  const [joinCode, setJoinCode] = useState('');

  const handleJoin = () => {
    if (joinCode.trim()) {
      onJoinOnline(joinCode.trim().toUpperCase());
      setJoinCode('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Game</DialogTitle>
          <DialogDescription>
            Choose how you want to play
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Button
            onClick={() => {
              onLocalGame();
              onClose();
            }}
            className="w-full"
            variant="default"
          >
            <span className="flex flex-col items-center">
              <span>Local Multiplayer</span>
              <span className="text-xs opacity-70">Play on this device</span>
            </span>
          </Button>
          
          <Button
            onClick={() => {
              onCreateOnline();
              onClose();
            }}
            className="w-full"
            variant="secondary"
          >
            <span className="flex flex-col items-center">
              <span>Create Online Game</span>
              <span className="text-xs opacity-70">Share link with friend</span>
            </span>
          </Button>
          
          <div className="space-y-2">
            <Label htmlFor="game-code">Or join with game code</Label>
            <div className="flex gap-2">
              <Input
                id="game-code"
                placeholder="ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                maxLength={6}
              />
              <Button onClick={handleJoin} disabled={!joinCode.trim()}>
                Join
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}