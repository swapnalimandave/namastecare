import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, User, Calendar, FileText, AlertTriangle, CheckCircle2, AlertCircle, Activity, Pill } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "normal" || status === "green") return <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />;
  if (status === "borderline" || status === "amber") return <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
  return <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
};

export default function DoctorView() {
  const { token } = useParams();
  const [member, setMember] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (token) fetchData(token);
  }, [token]);

  const fetchData = async (token: string) => {
    try {
      if (token.startsWith("self-")) {
        const selfUserId = token.replace("self-", "");
        setMember({ name: "Self", age: "", gender: "", phone_number: "", doctor_view_token: token } as any);

        const { data: recordsData } = await supabase
          .from("health_records")
          .select("*")
          .eq("user_id", selfUserId)
          .order("created_at", { ascending: false });

        setRecords(recordsData || []);
        setMedicines([]);
        return;
      }

      const { data: memberData, error } = await supabase
        .from("family_members")
        .select("*")
        .eq("doctor_view_token", token)
        .single();

      if (error || !memberData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setMember(memberData);

      const { data: recordsData } = await supabase
        .from("clinical_summaries")
        .select("*")
        .eq("family_member_id", memberData.id)
        .order("created_at", { ascending: false });

      setRecords(recordsData || []);

      const { data: medData } = await supabase
        .from("medicine_reminders")
        .select("*")
        .eq("family_member_id", memberData.id)
        .eq("active", true);

      setMedicines(medData || []);

    } catch (error) {
      console.error("Error:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading patient summary...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Patient not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-green-700 px-4 py-6 text-white">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Heart className="h-6 w-6" />
          <div>
            <h1 className="text-lg font-bold leading-tight">NamasteCare</h1>
            <p className="text-sm opacity-80">Patient Summary</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Card className="card-elevated border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <User className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-lg">{member?.name}</h2>
                <p className="text-sm text-muted-foreground">{member?.age} yrs • {member?.gender}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {records.length > 0 && records.map((record, idx) => {
          const summary = record.summary_json;
          return (
            <Card key={record.id} className="card-elevated border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-700" />
                  {summary?.report_type || "Health Report"}
                </CardTitle>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {summary?.report_date || new Date(record.created_at).toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {summary?.ai_flag && (
                  <p className="text-sm text-foreground font-medium">{summary.ai_flag}</p>
                )}
                {summary?.action && (
                  <p className="text-sm text-muted-foreground">Action: {summary.action}</p>
                )}
                {summary?.key_metrics && (
                  <div className="space-y-1.5">
                    {summary.key_metrics.map((metric: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-muted/50">
                        <StatusIcon status={metric.flag} />
                        <span>{metric.name}: {metric.value} {metric.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {records.length === 0 && (
          <Card className="card-elevated border-border">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">No health records uploaded yet.</p>
            </CardContent>
          </Card>
        )}

        {medicines.length > 0 && (
          <Card className="card-elevated border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Pill className="h-4 w-4 text-green-700" /> Current Medications
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {medicines.map((med) => (
                <div key={med.id} className="text-sm py-1.5 px-2.5 rounded-md bg-muted/50">
                  <span className="font-medium text-foreground">{med.medicine_name}</span>{" "}
                  <span className="text-muted-foreground">{med.dosage} — {med.times?.join(", ")}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground py-4">
          Shared via NamasteCare • For medical use only
        </p>
      </div>
    </div>
  );
}