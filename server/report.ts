import ExcelJS from "exceljs";
import type { User } from "@shared/schema";

interface AnalyticsPeriod {
  label: string;
  count: number;
  previousCount: number;
  growthPercent: number;
}

function calcGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

export async function generateRegistrationReport(users: User[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "A2A Global Inc";
  workbook.created = new Date();

  // ============================================================
  // SHEET 1: User Registry
  // ============================================================
  const userSheet = workbook.addWorksheet("User Registry", {
    properties: { tabColor: { argb: "0F3DD1" } },
  });

  // Header styling
  const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F3DD1" } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "D0D0D0" } },
    bottom: { style: "thin", color: { argb: "D0D0D0" } },
    left: { style: "thin", color: { argb: "D0D0D0" } },
    right: { style: "thin", color: { argb: "D0D0D0" } },
  };

  // Title row
  userSheet.mergeCells("A1:I1");
  const titleCell = userSheet.getCell("A1");
  titleCell.value = "A2A Global — Registered Freelancers";
  titleCell.font = { bold: true, size: 14, color: { argb: "0F3DD1" } };
  titleCell.alignment = { vertical: "middle" };
  userSheet.getRow(1).height = 30;

  // Subtitle
  userSheet.mergeCells("A2:I2");
  const subtitleCell = userSheet.getCell("A2");
  subtitleCell.value = `Report generated: ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC | Total users: ${users.length}`;
  subtitleCell.font = { size: 10, color: { argb: "666666" }, italic: true };
  userSheet.getRow(2).height = 20;

  // Column definitions
  userSheet.columns = [
    { key: "id", width: 8 },
    { key: "firstName", width: 18 },
    { key: "lastName", width: 18 },
    { key: "email", width: 30 },
    { key: "mobile", width: 18 },
    { key: "emailVerified", width: 15 },
    { key: "mobileVerified", width: 16 },
    { key: "kycStatus", width: 14 },
    { key: "createdAt", width: 22 },
  ];

  // Header row (row 4)
  const headers = ["#", "First Name", "Last Name", "Email", "Mobile", "Email Verified", "Mobile Verified", "KYC Status", "Registered At"];
  const headerRow = userSheet.getRow(4);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderStyle;
  });
  headerRow.height = 24;

  // Data rows
  const sortedUsers = [...users].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  sortedUsers.forEach((user, i) => {
    const row = userSheet.getRow(5 + i);
    row.getCell(1).value = i + 1;
    row.getCell(2).value = user.firstName;
    row.getCell(3).value = user.lastName;
    row.getCell(4).value = user.email;
    row.getCell(5).value = user.mobile || "—";
    row.getCell(6).value = user.emailVerified ? "✓ Yes" : "✗ No";
    row.getCell(7).value = user.mobileVerified ? "✓ Yes" : "✗ No";
    row.getCell(8).value = (user.kycStatus || "not_started").replace("_", " ");
    row.getCell(9).value = user.createdAt ? new Date(user.createdAt).toISOString().replace("T", " ").slice(0, 19) : "—";

    // Styling
    row.eachCell((cell) => {
      cell.border = borderStyle;
      cell.alignment = { vertical: "middle" };
    });

    // Color-code verification status
    const emailCell = row.getCell(6);
    emailCell.font = { color: { argb: user.emailVerified ? "22C55E" : "E74C3C" } };
    const mobileCell = row.getCell(7);
    mobileCell.font = { color: { argb: user.mobileVerified ? "22C55E" : "E74C3C" } };

    // Alternate row colors
    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F5F7FF" } };
      });
    }
  });

  // Auto-filter
  userSheet.autoFilter = { from: "A4", to: `I${4 + users.length}` };

  // ============================================================
  // SHEET 2: Analytics Dashboard
  // ============================================================
  const analyticsSheet = workbook.addWorksheet("Analytics Dashboard", {
    properties: { tabColor: { argb: "22C55E" } },
  });

  // Title
  analyticsSheet.mergeCells("A1:F1");
  const aTitle = analyticsSheet.getCell("A1");
  aTitle.value = "A2A Global — Registration Analytics";
  aTitle.font = { bold: true, size: 14, color: { argb: "0F3DD1" } };
  analyticsSheet.getRow(1).height = 30;

  analyticsSheet.mergeCells("A2:F2");
  analyticsSheet.getCell("A2").value = `As of ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`;
  analyticsSheet.getCell("A2").font = { size: 10, color: { argb: "666666" }, italic: true };

  // --- KPI Cards ---
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const thisWeekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000);
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 86400000);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  function countInRange(start: Date, end: Date): number {
    return users.filter((u) => {
      const d = u.createdAt ? new Date(u.createdAt) : null;
      return d && d >= start && d < end;
    }).length;
  }

  const todayCount = countInRange(todayStart, new Date(todayStart.getTime() + 86400000));
  const yesterdayCount = countInRange(yesterdayStart, todayStart);
  const thisWeekCount = countInRange(thisWeekStart, new Date());
  const lastWeekCount = countInRange(lastWeekStart, thisWeekStart);
  const thisMonthCount = countInRange(thisMonthStart, new Date());
  const lastMonthCount = countInRange(lastMonthStart, lastMonthEnd);

  const emailVerifiedCount = users.filter((u) => u.emailVerified).length;
  const mobileVerifiedCount = users.filter((u) => u.mobileVerified).length;
  const kycSubmitted = users.filter((u) => u.kycStatus && u.kycStatus !== "not_started").length;

  // KPI Section
  const kpiHeaderFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "171717" } };
  const kpiHeaderFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFF" }, size: 11 };

  // Row 4: KPI Headers
  const kpiHeaders = ["Metric", "Value", "Previous Period", "Growth", "Growth %", "Notes"];
  analyticsSheet.columns = [
    { key: "metric", width: 28 },
    { key: "value", width: 14 },
    { key: "previous", width: 18 },
    { key: "growth", width: 12 },
    { key: "growthPct", width: 12 },
    { key: "notes", width: 35 },
  ];

  const kpiRow = analyticsSheet.getRow(4);
  kpiHeaders.forEach((h, i) => {
    const cell = kpiRow.getCell(i + 1);
    cell.value = h;
    cell.fill = kpiHeaderFill;
    cell.font = kpiHeaderFont;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderStyle;
  });
  kpiRow.height = 24;

  // KPI Data
  const kpis = [
    { metric: "Total Registered Users", value: users.length, previous: "—", growth: "—", growthPct: "—", notes: "All-time cumulative" },
    { metric: "Today's Registrations", value: todayCount, previous: yesterdayCount, growth: todayCount - yesterdayCount, growthPct: calcGrowth(todayCount, yesterdayCount) + "%", notes: "vs. yesterday" },
    { metric: "This Week", value: thisWeekCount, previous: lastWeekCount, growth: thisWeekCount - lastWeekCount, growthPct: calcGrowth(thisWeekCount, lastWeekCount) + "%", notes: "vs. last week" },
    { metric: "This Month", value: thisMonthCount, previous: lastMonthCount, growth: thisMonthCount - lastMonthCount, growthPct: calcGrowth(thisMonthCount, lastMonthCount) + "%", notes: "vs. last month" },
    { metric: "—", value: "", previous: "", growth: "", growthPct: "", notes: "" },
    { metric: "Email Verified", value: emailVerifiedCount, previous: "—", growth: "—", growthPct: users.length > 0 ? Math.round((emailVerifiedCount / users.length) * 100) + "%" : "0%", notes: "% of total users" },
    { metric: "Mobile Verified", value: mobileVerifiedCount, previous: "—", growth: "—", growthPct: users.length > 0 ? Math.round((mobileVerifiedCount / users.length) * 100) + "%" : "0%", notes: "% of total users" },
    { metric: "KYC Submitted", value: kycSubmitted, previous: "—", growth: "—", growthPct: users.length > 0 ? Math.round((kycSubmitted / users.length) * 100) + "%" : "0%", notes: "% of total users" },
    { metric: "—", value: "", previous: "", growth: "", growthPct: "", notes: "" },
    { metric: "Avg. Registrations / Day", value: users.length > 0 ? (users.length / Math.max(1, Math.ceil((now.getTime() - new Date(sortedUsers[sortedUsers.length - 1]?.createdAt || now).getTime()) / 86400000))).toFixed(1) : "0", previous: "—", growth: "—", growthPct: "—", notes: "Since first registration" },
    { metric: "Conversion: Email → Mobile", value: emailVerifiedCount > 0 ? Math.round((mobileVerifiedCount / emailVerifiedCount) * 100) + "%" : "0%", previous: "—", growth: "—", growthPct: "—", notes: "Verified email → verified mobile" },
    { metric: "Conversion: Register → KYC", value: users.length > 0 ? Math.round((kycSubmitted / users.length) * 100) + "%" : "0%", previous: "—", growth: "—", growthPct: "—", notes: "Registered → KYC submitted" },
  ];

  kpis.forEach((kpi, i) => {
    const row = analyticsSheet.getRow(5 + i);
    row.getCell(1).value = kpi.metric;
    row.getCell(1).font = { bold: kpi.metric !== "—" };
    row.getCell(2).value = kpi.value;
    row.getCell(2).font = { bold: true, size: 12, color: { argb: "0F3DD1" } };
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(3).value = kpi.previous;
    row.getCell(3).alignment = { horizontal: "center" };
    row.getCell(4).value = kpi.growth;
    row.getCell(4).alignment = { horizontal: "center" };
    if (typeof kpi.growth === "number") {
      row.getCell(4).font = { color: { argb: kpi.growth >= 0 ? "22C55E" : "E74C3C" } };
    }
    row.getCell(5).value = kpi.growthPct;
    row.getCell(5).alignment = { horizontal: "center" };
    row.getCell(6).value = kpi.notes;
    row.getCell(6).font = { color: { argb: "999999" }, size: 10 };

    row.eachCell((cell) => { cell.border = borderStyle; });

    if (i % 2 === 1 && kpi.metric !== "—") {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0FFF0" } };
      });
    }
  });

  // ============================================================
  // SHEET 3: Daily Registration Log
  // ============================================================
  const dailySheet = workbook.addWorksheet("Daily Breakdown", {
    properties: { tabColor: { argb: "F59E0B" } },
  });

  dailySheet.mergeCells("A1:D1");
  dailySheet.getCell("A1").value = "Daily Registration Breakdown";
  dailySheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "0F3DD1" } };
  dailySheet.getRow(1).height = 30;

  dailySheet.columns = [
    { key: "date", width: 16 },
    { key: "count", width: 16 },
    { key: "cumulative", width: 16 },
    { key: "dailyGrowth", width: 18 },
  ];

  const dailyHeaders = ["Date", "Registrations", "Cumulative Total", "Daily Growth %"];
  const dHeaderRow = dailySheet.getRow(3);
  dailyHeaders.forEach((h, i) => {
    const cell = dHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = borderStyle;
  });

  // Group users by date
  const dateMap = new Map<string, number>();
  users.forEach((u) => {
    const d = u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : "unknown";
    dateMap.set(d, (dateMap.get(d) || 0) + 1);
  });

  const dates = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  let cumulative = 0;
  let prevCount = 0;

  dates.forEach(([date, count], i) => {
    cumulative += count;
    const growth = prevCount > 0 ? calcGrowth(count, prevCount) : (i === 0 ? 0 : 100);
    const row = dailySheet.getRow(4 + i);
    row.getCell(1).value = date;
    row.getCell(2).value = count;
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(3).value = cumulative;
    row.getCell(3).alignment = { horizontal: "center" };
    row.getCell(4).value = growth + "%";
    row.getCell(4).alignment = { horizontal: "center" };
    row.getCell(4).font = { color: { argb: growth >= 0 ? "22C55E" : "E74C3C" } };
    row.eachCell((cell) => { cell.border = borderStyle; });
    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFBEB" } };
      });
    }
    prevCount = count;
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
