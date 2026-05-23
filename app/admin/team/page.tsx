import { TeamManagement } from "@/components/team/team-management";
import { getCallerTeams, getManagerOptions, getTeamUsers } from "@/lib/team/queries";

export default async function AdminTeamPage() {
  const [users, teams, managers] = await Promise.all([
    getTeamUsers(),
    getCallerTeams(),
    getManagerOptions(),
  ]);

  return <TeamManagement users={users} teams={teams} managers={managers} />;
}
