import { requireUser } from '@/lib/auth';
import { getDict } from '@/lib/i18n';
import { updateMyName } from '@/app/actions';

export default async function ProfilePage() {
  const { profile } = await requireUser();
  const { t } = await getDict();
  return (
    <div className="max-w-md">
      <h1 className="h1">{t.profile}</h1>
      <form action={updateMyName} className="card mt-8 space-y-4 p-6">
        <div><label className="label">{t.fullName}</label><input name="full_name" defaultValue={profile.full_name} className="input" /></div>
        <div><label className="label">{t.email}</label><input value={profile.email ?? ''} disabled className="input opacity-70" /></div>
        <button className="btn-dark">{t.save}</button>
      </form>
    </div>
  );
}
