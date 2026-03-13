import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Camera, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileData {
  full_name: string;
  email: string;
  designation: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  years_of_experience: number | null;
  department_name?: string;
}

interface ProfileEditPopoverProps {
  children: React.ReactNode;
}

const ProfileEditPopover: React.FC<ProfileEditPopoverProps> = ({ children }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editData, setEditData] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchProfile();
    }
  }, [isOpen, user]);

  const fetchProfile = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, departments(name)')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const departments = data.departments as { name: string } | null;
      const profileData: ProfileData = {
        full_name: data.full_name,
        email: data.email,
        designation: data.designation,
        avatar_url: data.avatar_url,
        date_of_birth: data.date_of_birth,
        years_of_experience: data.years_of_experience,
        department_name: departments?.name,
      };
      setProfile(profileData);
      setEditData(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !editData) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name,
          designation: editData.designation,
          date_of_birth: editData.date_of_birth || null,
          years_of_experience: editData.years_of_experience || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile(editData);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('faculty-files')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('faculty-files')
        .getPublicUrl(fileName);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile((prev) => prev ? { ...prev, avatar_url: avatarUrl } : null);
      setEditData((prev) => prev ? { ...prev, avatar_url: avatarUrl } : null);
      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setEditData(profile);
    setIsEditing(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80" side="top" align="start">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : profile ? (
          <div className="space-y-4">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {profile.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={isUploading}
                />
              </div>
              <div className="text-center">
                <p className="font-semibold">{profile.full_name}</p>
                <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>

            {/* Profile Details */}
            {isEditing && editData ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name" className="text-xs">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={editData.full_name}
                    onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-designation" className="text-xs">Designation</Label>
                  <Input
                    id="edit-designation"
                    value={editData.designation || ''}
                    onChange={(e) => setEditData({ ...editData, designation: e.target.value })}
                    placeholder="e.g., Assistant Professor"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-dob" className="text-xs">Date of Birth</Label>
                  <Input
                    id="edit-dob"
                    type="date"
                    value={editData.date_of_birth || ''}
                    onChange={(e) => setEditData({ ...editData, date_of_birth: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-experience" className="text-xs">Years of Experience</Label>
                  <Input
                    id="edit-experience"
                    type="number"
                    min="0"
                    value={editData.years_of_experience || ''}
                    onChange={(e) => setEditData({ ...editData, years_of_experience: parseInt(e.target.value) || null })}
                    placeholder="e.g., 5"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    Save
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium truncate ml-2">{profile.email}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Designation</span>
                  <span className="font-medium">{profile.designation || '-'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">{profile.department_name || '-'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted-foreground">Date of Birth</span>
                  <span className="font-medium">
                    {profile.date_of_birth
                      ? new Date(profile.date_of_birth).toLocaleDateString()
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Experience</span>
                  <span className="font-medium">
                    {profile.years_of_experience ? `${profile.years_of_experience} years` : '-'}
                  </span>
                </div>
                <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">No profile data</p>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default ProfileEditPopover;
