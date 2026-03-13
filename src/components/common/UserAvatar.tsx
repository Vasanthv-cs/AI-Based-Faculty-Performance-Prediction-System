import React, { useEffect, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  userId?: string;
  name?: string;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  name,
  avatarUrl,
  className,
  fallbackClassName,
}) => {
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null>(avatarUrl || null);

  useEffect(() => {
    // If avatarUrl is provided directly, use it
    if (avatarUrl) {
      setResolvedAvatarUrl(avatarUrl);
      return;
    }

    // If userId is provided, fetch the avatar from profile
    if (userId) {
      const fetchAvatar = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('user_id', userId)
          .single();
        
        if (data?.avatar_url) {
          setResolvedAvatarUrl(data.avatar_url);
        }
      };
      fetchAvatar();
    }
  }, [userId, avatarUrl]);

  const initials = name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <Avatar className={cn('h-10 w-10', className)}>
      <AvatarImage src={resolvedAvatarUrl || undefined} alt={name || 'User'} />
      <AvatarFallback className={cn('bg-primary/10 text-primary font-medium', fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
