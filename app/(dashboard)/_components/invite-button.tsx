import { Plus } from 'lucide-react';
import { OrganizationProfile } from '@clerk/nextjs';

import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export const InviteButton = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Invite members
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 bg-transparent border-none max-w-[calc(100%-2rem)] sm:max-w-220 w-full max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogTitle className="sr-only">Invite members</DialogTitle>
        <OrganizationProfile routing="hash" />
      </DialogContent>
    </Dialog>
  );
};
