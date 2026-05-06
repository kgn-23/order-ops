"use client";

import type { FormEvent } from "react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createCallerTeam, createTeamUser, updateTeamUser } from "@/app/actions/team";
import type { CallerTeamRow, TeamUserRow } from "@/app/server/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SheetMode =
  | { open: false }
  | { open: true; kind: "create" }
  | { open: true; kind: "edit"; user: TeamUserRow };

type ManagerOption = { id: string; name: string; email: string };

function primaryOperationalRole(roles: ("MANAGER" | "CALLER")[]) {
  if (roles.includes("MANAGER")) return "MANAGER" as const;
  return "CALLER" as const;
}

export function TeamManagement({
  users: initialUsers,
  teams,
  managers,
}: {
  users: TeamUserRow[];
  teams: CallerTeamRow[];
  managers: ManagerOption[];
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [sheet, setSheet] = useState<SheetMode>({ open: false });
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"MANAGER" | "CALLER">("CALLER");
  const [isActive, setIsActive] = useState(true);
  const [callerTeamId, setCallerTeamId] = useState(teams[0]?.id ?? "");

  const [teamName, setTeamName] = useState("");
  const [leaderUserId, setLeaderUserId] = useState(managers[0]?.id ?? "");

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    setCallerTeamId((prev) => (teams.some((t) => t.id === prev) ? prev : (teams[0]?.id ?? "")));
  }, [teams]);

  useEffect(() => {
    setLeaderUserId((prev) =>
      managers.some((m) => m.id === prev) ? prev : (managers[0]?.id ?? ""),
    );
  }, [managers]);

  function openCreate() {
    setName("");
    setEmail("");
    setPhone("");
    setRole("CALLER");
    setIsActive(true);
    setCallerTeamId(teams[0]?.id ?? "");
    setSheet({ open: true, kind: "create" });
  }

  function openEdit(user: TeamUserRow) {
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone ?? "");
    setRole(primaryOperationalRole(user.operationalRoles));
    setIsActive(user.isActive);
    setCallerTeamId(user.callerTeam?.id ?? teams[0]?.id ?? "");
    setSheet({ open: true, kind: "edit", user });
  }

  function closeSheet() {
    setSheet({ open: false });
  }

  async function onSubmitCreate(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createTeamUser({
        name,
        email,
        phone: phone.trim() || undefined,
        role,
        callerTeamId: role === "CALLER" ? callerTeamId : undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Team member added.");
      closeSheet();
      router.refresh();
    });
  }

  async function onSubmitEdit(event: FormEvent) {
    event.preventDefault();
    if (sheet.open !== true || sheet.kind !== "edit") return;
    const { user } = sheet;
    startTransition(async () => {
      const result = await updateTeamUser({
        userId: user.id,
        name,
        email,
        phone: phone.trim() || undefined,
        isActive,
        role,
        callerTeamId: role === "CALLER" ? callerTeamId : undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Team member updated.");
      closeSheet();
      router.refresh();
    });
  }

  async function onCreateTeam(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createCallerTeam({ name: teamName, leaderUserId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Caller team created.");
      setTeamName("");
      router.refresh();
    });
  }

  const isCreate = sheet.open && sheet.kind === "create";
  const isEdit = sheet.open && sheet.kind === "edit";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Caller teams</CardTitle>
          <CardDescription>
            Each team has one manager leader. Callers are assigned into these teams.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onCreateTeam} className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="North Zone Team"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Leader (manager)</Label>
              <Select value={leaderUserId || undefined} onValueChange={setLeaderUserId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name} ({manager.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={pending || !teamName.trim() || !leaderUserId}
                className="w-full md:w-auto"
              >
                {pending ? "Creating..." : "Create team"}
              </Button>
            </div>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Leader</TableHead>
                <TableHead>Callers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No caller teams yet.
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>
                      {team.leader.name}
                      <p className="text-xs text-muted-foreground">{team.leader.email}</p>
                    </TableCell>
                    <TableCell>{team.callerCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Managers & callers</CardTitle>
            <CardDescription>
              Callers must belong to a team. Managers can lead teams through the section above.
            </CardDescription>
          </div>
          <Button type="button" onClick={openCreate}>
            Add team member
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No managers or callers yet. Use &quot;Add team member&quot; to create one.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.phone ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.operationalRoles.map((r) => (
                          <Badge key={r} variant="outline">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{u.callerTeam?.name ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? "default" : "secondary"}>
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(u)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={sheet.open} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent className="flex flex-col sm:max-w-md">
          {isCreate ? (
            <form onSubmit={onSubmitCreate} className="flex flex-1 flex-col gap-4">
              <SheetHeader>
                <SheetTitle>Add team member</SheetTitle>
                <SheetDescription>
                  Create a manager/caller profile. Caller role requires a team assignment.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
                <div className="space-y-2">
                  <Label htmlFor="tm-name">Name</Label>
                  <Input id="tm-name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tm-email">Email</Label>
                  <Input
                    id="tm-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tm-phone">Phone (optional)</Label>
                  <Input id="tm-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as "MANAGER" | "CALLER")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="CALLER">Caller</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {role === "CALLER" ? (
                  <div className="space-y-2">
                    <Label>Caller team</Label>
                    <Select value={callerTeamId || undefined} onValueChange={setCallerTeamId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
              <SheetFooter className="flex-row justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={closeSheet}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending || (role === "CALLER" && !callerTeamId)}>
                  {pending ? "Saving..." : "Create"}
                </Button>
              </SheetFooter>
            </form>
          ) : null}

          {isEdit ? (
            <form onSubmit={onSubmitEdit} className="flex flex-1 flex-col gap-4">
              <SheetHeader>
                <SheetTitle>Edit team member</SheetTitle>
                <SheetDescription>Update profile, role, team assignment, or active status.</SheetDescription>
              </SheetHeader>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
                <div className="space-y-2">
                  <Label htmlFor="tm-edit-name">Name</Label>
                  <Input
                    id="tm-edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tm-edit-email">Email</Label>
                  <Input
                    id="tm-edit-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tm-edit-phone">Phone (optional)</Label>
                  <Input id="tm-edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as "MANAGER" | "CALLER")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="CALLER">Caller</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {role === "CALLER" ? (
                  <div className="space-y-2">
                    <Label>Caller team</Label>
                    <Select value={callerTeamId || undefined} onValueChange={setCallerTeamId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="tm-active"
                    checked={isActive}
                    onCheckedChange={(c) => setIsActive(c === true)}
                  />
                  <Label htmlFor="tm-active" className="font-normal">
                    Active
                  </Label>
                </div>
              </div>
              <SheetFooter className="flex-row justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={closeSheet}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending || (role === "CALLER" && !callerTeamId)}>
                  {pending ? "Saving..." : "Save changes"}
                </Button>
              </SheetFooter>
            </form>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
