import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill, Clock, MessageCircle, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Medicine {
  id: string;
  medicine_name: string;
  dosage: string;
  times: string[];
  active: boolean;
  family_member_id: string;
  member_name?: string;
  phone_number?: string;
}

export default function MedicineReminders() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [form, setForm] = useState({
    medicine_name: "",
    dosage: "",
    times: "",
    family_member_id: ""
  });

  useEffect(() => {
    fetchMedicines();
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("family_members")
      .select("*")
      .eq("user_id", user.id);
    setMembers(data || []);
  };

  const fetchMedicines = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from("family_members")
        .select("id, name, phone_number")
        .eq("user_id", user.id);

      if (!memberData || memberData.length === 0) {
        setLoading(false);
        return;
      }

      const memberIds = memberData.map(m => m.id);
      const { data: reminders } = await supabase
        .from("medicine_reminders")
        .select("*")
        .in("family_member_id", memberIds)
        .eq("active", true);

      const enriched = (reminders || []).map(r => {
        const member = memberData.find(m => m.id === r.family_member_id);
        return {
          ...r,
          member_name: member?.name || "Unknown",
          phone_number: member?.phone_number || ""
        };
      });

      setMedicines(enriched);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.medicine_name || !form.family_member_id) {
      toast.error("Please fill medicine name and select family member");
      return;
    }
    setSaving(true);
    try {
      const timesArray = form.times.split(",").map(t => t.trim()).filter(Boolean);
      const { error } = await supabase
        .from("medicine_reminders")
        .insert({
          medicine_name: form.medicine_name,
          dosage: form.dosage,
          times: timesArray,
          family_member_id: form.family_member_id,
          active: true
        });
      if (error) throw error;
      toast.success("Medicine reminder added!");
      setForm({ medicine_name: "", dosage: "", times: "", family_member_id: "" });
      setOpen(false);
      fetchMedicines();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to add reminder");
    } finally {
      setSaving(false);
    }
  };

  const sendWhatsApp = (med: Medicine) => {
    const firstName = med.member_name?.split(" ")[0] || "there";
    const message = encodeURIComponent(
      `💊 Medicine Reminder — NamasteCare\n\nNamaste ${firstName} ji,\nAapki dawai lene ka waqt ho gaya hai:\n\n• ${med.medicine_name} ${med.dosage}\n• Time: ${med.times?.join(", ")}\n\nSwasth rahein! 🙏`
    );
    const phone = med.phone_number?.replace(/[^0-9]/g, "") || "";
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between animate-reveal">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Medicine Reminders</h1>
          <p className="text-muted-foreground text-sm mt-1">Send timely medicine reminders via WhatsApp</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Reminder</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Medicine Reminder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Family Member</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm"
                  value={form.family_member_id}
                  onChange={(e) => setForm({ ...form, family_member_id: e.target.value })}
                >
                  <option value="">Select member</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Medicine Name</Label>
                <Input placeholder="e.g. Metformin" value={form.medicine_name} onChange={(e) => setForm({ ...form, medicine_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Dosage</Label>
                <Input placeholder="e.g. 500mg" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Times (comma separated)</Label>
                <Input placeholder="e.g. 8:00 AM, 8:00 PM" value={form.times} onChange={(e) => setForm({ ...form, times: e.target.value })} />
              </div>
              <Button className="w-full" onClick={handleAdd} disabled={saving}>
                {saving ? "Adding..." : "Add Reminder"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : medicines.length === 0 ? (
        <p className="text-muted-foreground text-sm">No medicine reminders yet. Add your first reminder.</p>
      ) : (
        <div className="space-y-3">
          {medicines.map((med) => (
            <Card key={med.id} className="card-elevated border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Pill className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {med.medicine_name} <span className="font-normal text-muted-foreground">{med.dosage}</span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">{med.member_name}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{med.times?.join(", ")}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="default" size="sm" className="flex-shrink-0 bg-green-600 hover:bg-green-700" onClick={() => sendWhatsApp(med)}>
                    <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}