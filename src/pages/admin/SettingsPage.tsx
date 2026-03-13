 import React, { useState, useEffect } from 'react';
 import DashboardLayout from '@/components/layout/DashboardLayout';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from '@/components/ui/table';
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from '@/components/ui/alert-dialog';
 import { supabase } from '@/integrations/supabase/client';
 import { useToast } from '@/hooks/use-toast';
 import { Search, Users, ShieldPlus, ShieldMinus, UserCog, Eye } from 'lucide-react';
 import { Badge } from '@/components/ui/badge';
 import FacultyDetailModal from '@/components/dashboard/FacultyDetailModal';
 
 interface StaffMember {
   user_id: string;
   full_name: string;
   email: string;
   designation: string | null;
   department_name: string | null;
   role: string;
 }
 
 const SettingsPage: React.FC = () => {
   const [staff, setStaff] = useState<StaffMember[]>([]);
   const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
   const [isModalOpen, setIsModalOpen] = useState(false);
   
   // Admin management dialogs
   const [addAdminDialogOpen, setAddAdminDialogOpen] = useState(false);
   const [removeAdminDialogOpen, setRemoveAdminDialogOpen] = useState(false);
   const [selectedUser, setSelectedUser] = useState<StaffMember | null>(null);
   const [isProcessing, setIsProcessing] = useState(false);
   
   const { toast } = useToast();
 
   useEffect(() => {
     fetchData();
   }, []);
 
   useEffect(() => {
     filterStaff();
   }, [staff, searchQuery]);
 
   const fetchData = async () => {
     setIsLoading(true);
     try {
       // Fetch all profiles with department info
       const { data: profilesData, error: profilesError } = await supabase
         .from('profiles')
         .select('user_id, full_name, email, designation, department_id, departments(name)');
 
       if (profilesError) throw profilesError;
 
       // Fetch all user roles
       const { data: rolesData, error: rolesError } = await supabase
         .from('user_roles')
         .select('user_id, role');
 
       if (rolesError) throw rolesError;
 
       // Combine data
       const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);
 
       const staffList: StaffMember[] = (profilesData || []).map(p => ({
         user_id: p.user_id,
         full_name: p.full_name,
         email: p.email,
         designation: p.designation,
         department_name: (p.departments as { name: string } | null)?.name || null,
         role: rolesMap.get(p.user_id) || 'faculty',
       }));
 
       setStaff(staffList);
     } catch (error) {
       console.error('Error fetching data:', error);
       toast({
         title: 'Error',
         description: 'Failed to fetch staff data',
         variant: 'destructive',
       });
     } finally {
       setIsLoading(false);
     }
   };
 
   const filterStaff = () => {
     let filtered = [...staff];
 
     if (searchQuery) {
       const query = searchQuery.toLowerCase();
       filtered = filtered.filter(
         s => s.full_name.toLowerCase().includes(query) || 
              s.email.toLowerCase().includes(query)
       );
     }
 
     setFilteredStaff(filtered);
   };
 
   const handleAddAdminClick = (member: StaffMember) => {
     setSelectedUser(member);
     setAddAdminDialogOpen(true);
   };
 
   const handleRemoveAdminClick = (member: StaffMember) => {
     setSelectedUser(member);
     setRemoveAdminDialogOpen(true);
   };
 
   const handleAddAdminConfirm = async () => {
     if (!selectedUser) return;
 
     setIsProcessing(true);
     try {
       // Update the user's role to admin
       const { error } = await supabase
         .from('user_roles')
         .update({ role: 'admin' })
         .eq('user_id', selectedUser.user_id);
 
       if (error) throw error;
 
       toast({
         title: 'Success',
         description: `${selectedUser.full_name} is now an Admin.`,
       });
 
       // Refresh data
       fetchData();
     } catch (error) {
       console.error('Error adding admin:', error);
       toast({
         title: 'Error',
         description: 'Failed to add admin role',
         variant: 'destructive',
       });
     } finally {
       setIsProcessing(false);
       setAddAdminDialogOpen(false);
       setSelectedUser(null);
     }
   };
 
   const handleRemoveAdminConfirm = async () => {
     if (!selectedUser) return;
 
     setIsProcessing(true);
     try {
       // Update the user's role back to faculty
       const { error } = await supabase
         .from('user_roles')
         .update({ role: 'faculty' })
         .eq('user_id', selectedUser.user_id);
 
       if (error) throw error;
 
       toast({
         title: 'Success',
         description: `${selectedUser.full_name} is no longer an Admin.`,
       });
 
       // Refresh data
       fetchData();
     } catch (error) {
       console.error('Error removing admin:', error);
       toast({
         title: 'Error',
         description: 'Failed to remove admin role',
         variant: 'destructive',
       });
     } finally {
       setIsProcessing(false);
       setRemoveAdminDialogOpen(false);
       setSelectedUser(null);
     }
   };
 
   const handleViewDetails = (userId: string) => {
     setSelectedFacultyId(userId);
     setIsModalOpen(true);
   };
 
   const getRoleBadgeVariant = (role: string) => {
     switch (role) {
       case 'admin': return 'destructive';
       default: return 'secondary';
     }
   };

   const getRoleDisplayLabel = (role: string) => {
     if (role === 'hod') return 'FACULTY';
     return role.toUpperCase();
   };
 
   // Stats calculations
   const totalFaculty = staff.filter(s => s.role === 'faculty').length;
   const totalAdmins = staff.filter(s => s.role === 'admin').length;
   const totalStaff = staff.length;
 
   // Get non-admin staff for "Add Admin" list
   const nonAdminStaff = filteredStaff.filter(s => s.role !== 'admin');
   // Get current admins for "Remove Admin" list
   const adminStaff = filteredStaff.filter(s => s.role === 'admin');
 
   return (
     <DashboardLayout>
       <div className="mb-8">
         <h1 className="font-display text-3xl font-bold mb-2">Settings</h1>
         <p className="text-muted-foreground">Manage system settings and admin roles</p>
       </div>
 
       {/* Stats Cards */}
       <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
         <Card>
           <CardContent className="p-4">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                 <Users className="w-5 h-5 text-primary" />
               </div>
               <div>
                 <p className="text-2xl font-bold">{totalStaff}</p>
                 <p className="text-sm text-muted-foreground">Total Staff</p>
               </div>
             </div>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="p-4">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                 <Users className="w-5 h-5 text-success" />
               </div>
               <div>
                 <p className="text-2xl font-bold">{totalFaculty}</p>
                 <p className="text-sm text-muted-foreground">Faculty</p>
               </div>
             </div>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="p-4">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                 <UserCog className="w-5 h-5 text-destructive" />
               </div>
               <div>
                 <p className="text-2xl font-bold">{totalAdmins}</p>
                 <p className="text-sm text-muted-foreground">Admins</p>
               </div>
             </div>
           </CardContent>
         </Card>
       </div>
 
       {/* Search */}
       <Card className="mb-6">
         <CardContent className="p-4">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <Input
               placeholder="Search by name or email..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="pl-9"
             />
           </div>
         </CardContent>
       </Card>
 
       <div className="grid lg:grid-cols-2 gap-6">
         {/* Add Admin Section */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <ShieldPlus className="w-5 h-5 text-success" />
               Add Admin
             </CardTitle>
             <CardDescription>
               Promote faculty to admin role
             </CardDescription>
           </CardHeader>
           <CardContent>
             {isLoading ? (
               <div className="flex items-center justify-center py-8">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
               </div>
             ) : (
               <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Name</TableHead>
                       <TableHead className="text-center">Role</TableHead>
                       <TableHead className="text-right">Actions</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {nonAdminStaff.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                           No non-admin staff found
                         </TableCell>
                       </TableRow>
                     ) : (
                       nonAdminStaff.map((member) => (
                         <TableRow 
                           key={member.user_id} 
                           className="cursor-pointer hover:bg-muted/50"
                           onClick={() => handleViewDetails(member.user_id)}
                         >
                           <TableCell>
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                                 {member.full_name.charAt(0)}
                               </div>
                               <div>
                                 <p className="font-medium text-sm">{member.full_name}</p>
                                 <p className="text-xs text-muted-foreground">{member.email}</p>
                               </div>
                             </div>
                           </TableCell>
                           <TableCell className="text-center">
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              {getRoleDisplayLabel(member.role)}
                            </Badge>
                           </TableCell>
                           <TableCell className="text-right">
                             <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleViewDetails(member.user_id)}
                               >
                                 <Eye className="w-4 h-4" />
                               </Button>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 className="text-success border-success hover:bg-success/10"
                                 onClick={() => handleAddAdminClick(member)}
                               >
                                 <ShieldPlus className="w-4 h-4" />
                               </Button>
                             </div>
                           </TableCell>
                         </TableRow>
                       ))
                     )}
                   </TableBody>
                 </Table>
               </div>
             )}
           </CardContent>
         </Card>
 
         {/* Remove Admin Section */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <ShieldMinus className="w-5 h-5 text-destructive" />
               Remove Admin
             </CardTitle>
             <CardDescription>
               Demote admin back to faculty role
             </CardDescription>
           </CardHeader>
           <CardContent>
             {isLoading ? (
               <div className="flex items-center justify-center py-8">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
               </div>
             ) : (
               <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Name</TableHead>
                       <TableHead className="text-center">Role</TableHead>
                       <TableHead className="text-right">Actions</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {adminStaff.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                           No admins found
                         </TableCell>
                       </TableRow>
                     ) : (
                       adminStaff.map((member) => (
                         <TableRow 
                           key={member.user_id} 
                           className="cursor-pointer hover:bg-muted/50"
                           onClick={() => handleViewDetails(member.user_id)}
                         >
                           <TableCell>
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive font-medium text-sm">
                                 {member.full_name.charAt(0)}
                               </div>
                               <div>
                                 <p className="font-medium text-sm">{member.full_name}</p>
                                 <p className="text-xs text-muted-foreground">{member.email}</p>
                               </div>
                             </div>
                           </TableCell>
                           <TableCell className="text-center">
                             <Badge variant="destructive">ADMIN</Badge>
                           </TableCell>
                           <TableCell className="text-right">
                             <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => handleViewDetails(member.user_id)}
                               >
                                 <Eye className="w-4 h-4" />
                               </Button>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 className="text-destructive border-destructive hover:bg-destructive/10"
                                 onClick={() => handleRemoveAdminClick(member)}
                               >
                                 <ShieldMinus className="w-4 h-4" />
                               </Button>
                             </div>
                           </TableCell>
                         </TableRow>
                       ))
                     )}
                   </TableBody>
                 </Table>
               </div>
             )}
           </CardContent>
         </Card>
       </div>
 
       {/* Add Admin Confirmation Dialog */}
       <AlertDialog open={addAdminDialogOpen} onOpenChange={setAddAdminDialogOpen}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Add Admin Role</AlertDialogTitle>
             <AlertDialogDescription>
               Are you sure you want to make <strong>{selectedUser?.full_name}</strong> an Admin? 
               They will have full access to all system features.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
             <AlertDialogAction
               onClick={handleAddAdminConfirm}
               disabled={isProcessing}
               className="bg-success text-success-foreground hover:bg-success/90"
             >
               {isProcessing ? 'Processing...' : 'Confirm'}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
 
       {/* Remove Admin Confirmation Dialog */}
       <AlertDialog open={removeAdminDialogOpen} onOpenChange={setRemoveAdminDialogOpen}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Remove Admin Role</AlertDialogTitle>
             <AlertDialogDescription>
               Are you sure you want to remove admin privileges from <strong>{selectedUser?.full_name}</strong>? 
               They will be demoted to faculty role.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
             <AlertDialogAction
               onClick={handleRemoveAdminConfirm}
               disabled={isProcessing}
               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
             >
               {isProcessing ? 'Processing...' : 'Remove'}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
 
       {/* Faculty Detail Modal */}
       <FacultyDetailModal
         facultyId={selectedFacultyId}
         isOpen={isModalOpen}
         onClose={() => setIsModalOpen(false)}
       />
     </DashboardLayout>
   );
 };
 
 export default SettingsPage;