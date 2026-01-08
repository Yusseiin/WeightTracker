"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { showSuccessToast, showErrorToast } from '@/components/ui/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-react';
import type { User, UserRole } from '@/lib/types';

type UserWithoutPassword = Omit<User, 'password'>;

const createUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  nickname: z.string().min(1, 'Nickname is required'),
  role: z.enum(['admin', 'user']),
});

const editUserSchema = z.object({
  nickname: z.string().min(1, 'Nickname is required'),
  role: z.enum(['admin', 'user']),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

interface UserManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUsername: string;
}

export function UserManagementDialog({ open, onOpenChange, currentUsername }: UserManagementDialogProps) {
  const [users, setUsers] = useState<UserWithoutPassword[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithoutPassword | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithoutPassword | null>(null);

  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: '',
      password: '',
      nickname: '',
      role: 'user',
    },
  });

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      nickname: '',
      role: 'user',
    },
  });

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users');
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      } else {
        showErrorToast(result.error || 'Failed to fetch users');
      }
    } catch {
      showErrorToast('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open, fetchUsers]);

  const handleCreateUser = async (data: CreateUserFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast('User created successfully');
        createForm.reset();
        setShowCreateForm(false);
        fetchUsers();
      } else {
        showErrorToast(result.error || 'Failed to create user');
      }
    } catch {
      showErrorToast('Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async (data: EditUserFormData) => {
    if (!editingUser) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${editingUser.username}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast('User updated successfully');
        setEditingUser(null);
        fetchUsers();
      } else {
        showErrorToast(result.error || 'Failed to update user');
      }
    } catch {
      showErrorToast('Failed to update user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${deletingUser.username}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast('User deleted successfully');
        setDeletingUser(null);
        fetchUsers();
      } else {
        showErrorToast(result.error || 'Failed to delete user');
      }
    } catch {
      showErrorToast('Failed to delete user');
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (user: UserWithoutPassword) => {
    setEditingUser(user);
    editForm.reset({
      nickname: user.nickname,
      role: user.role,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-125 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Users</DialogTitle>
          </DialogHeader>

          {/* User List */}
          <div className="space-y-2">
            {isLoading && users.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin pointer-events-none" />
              </div>
            ) : (
              users.map(user => (
                <div
                  key={user.username}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.nickname}</span>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">@{user.username}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(user)}
                      disabled={isLoading}
                    >
                      <Pencil className="h-4 w-4 pointer-events-none" />
                    </Button>
                    {user.username !== currentUsername && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingUser(user)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4 text-destructive pointer-events-none" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Create User Form */}
          {showCreateForm ? (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">New User</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowCreateForm(false);
                    createForm.reset();
                  }}
                >
                  <X className="h-4 w-4 pointer-events-none" />
                </Button>
              </div>

              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreateUser)} className="space-y-3">
                  <FormField
                    control={createForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="nickname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nickname</FormLabel>
                        <FormControl>
                          <Input placeholder="Display Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        createForm.reset();
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin pointer-events-none" />}
                      Create
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="mr-2 h-4 w-4 pointer-events-none" />
              Add User
            </Button>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={open => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-100">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>

          {editingUser && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditUser)} className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Username: @{editingUser.username}
                </div>

                <FormField
                  control={editForm.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nickname</FormLabel>
                      <FormControl>
                        <Input placeholder="Display Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={editingUser.username === currentUsername}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {editingUser.username === currentUsername && (
                        <p className="text-xs text-muted-foreground">
                          You cannot change your own role
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingUser(null)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin pointer-events-none" />}
                    Save
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingUser} onOpenChange={open => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user &quot;{deletingUser?.nickname}&quot; (@{deletingUser?.username}).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
