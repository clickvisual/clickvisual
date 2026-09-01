import ReactDOM from "react-dom/client";
import type { ReactNode } from "react";
import { EuiContext, EuiProvider } from "@elastic/eui";
import { RouterProvider } from "react-router-dom";
import { CustomProvider } from "rsuite";
import zhCN from "rsuite/locales/zh_CN";
import moment from "moment";
import "moment/locale/zh-cn";
import { router } from "./app/router";
import { getPublicPathLoginRedirectHref } from "./shared/layout/VersionSwitcher";
import "rsuite/dist/rsuite-no-reset.min.css";
import "@elastic/charts/dist/theme_only_light.css";
import "./styles.css";

moment.locale("zh-cn");

const publicPathRedirectHref = getPublicPathLoginRedirectHref();
const euiI18n = {
  locale: "en",
  mapping: {
    "euiTimeWindowButtons.previousDescription": ({ displayInterval }: Record<string, unknown>) =>
      `Shift backward ${displayInterval ?? ""}`,
    "euiTimeWindowButtons.nextDescription": ({ displayInterval }: Record<string, unknown>) =>
      `Shift forward ${displayInterval ?? ""}`,
    "euiTimeWindowButtons.invalidShiftLabel": "Cannot shift an invalid time window",
    "euiTimeWindowButtons.invalidZoomInLabel": "Cannot zoom in on an invalid time window",
    "euiTimeWindowButtons.cannotZoomInLabel": "Cannot zoom in any further",
    "euiTimeWindowButtons.invalidZoomOutLabel": "Cannot zoom out on an invalid time window",
    "euiTimeWindowButtons.previousLabel": "Previous",
    "euiTimeWindowButtons.zoomInLabel": "Zoom in",
    "euiTimeWindowButtons.zoomOutLabel": "Zoom out",
    "euiTimeWindowButtons.nextLabel": "Next",
    "euiQuickSelectPopover.buttonLabel": "Select time range",
    "euiQuickSelect.quickSelectTitle": "Quick select",
    "euiQuickSelect.previousLabel": "Previous time window",
    "euiQuickSelect.nextLabel": "Next time window",
    "euiQuickSelect.tenseLabel": "Time direction",
    "euiQuickSelect.valueLabel": "Time value",
    "euiQuickSelect.unitLabel": "Time unit",
    "euiQuickSelect.applyButton": "Apply",
    "euiQuickSelect.fullDescription": ({ timeTense, timeValue, timeUnit }: Record<string, unknown>) =>
      `Current setting is ${timeTense ?? ""} ${timeValue ?? ""} ${timeUnit ?? ""}`,
    "euiCommonlyUsedTimeRanges.legend": "Commonly used",
    "euiTimeOptions.last": "Last",
    "euiTimeOptions.next": "Next",
    "euiTimeOptions.seconds": "seconds",
    "euiTimeOptions.minutes": "minutes",
    "euiTimeOptions.hours": "hours",
    "euiTimeOptions.days": "days",
    "euiTimeOptions.weeks": "weeks",
    "euiTimeOptions.months": "months",
    "euiTimeOptions.years": "years",
    "euiTimeOptions.secondsAgo": "seconds ago",
    "euiTimeOptions.minutesAgo": "minutes ago",
    "euiTimeOptions.hoursAgo": "hours ago",
    "euiTimeOptions.daysAgo": "days ago",
    "euiTimeOptions.weeksAgo": "weeks ago",
    "euiTimeOptions.monthsAgo": "months ago",
    "euiTimeOptions.yearsAgo": "years ago",
    "euiTimeOptions.secondsFromNow": "seconds from now",
    "euiTimeOptions.minutesFromNow": "minutes from now",
    "euiTimeOptions.hoursFromNow": "hours from now",
    "euiTimeOptions.daysFromNow": "days from now",
    "euiTimeOptions.weeksFromNow": "weeks from now",
    "euiTimeOptions.monthsFromNow": "months from now",
    "euiTimeOptions.yearsFromNow": "years from now",
    "euiTimeOptions.roundToSecond": "Round to the second",
    "euiTimeOptions.roundToMinute": "Round to the minute",
    "euiTimeOptions.roundToHour": "Round to the hour",
    "euiTimeOptions.roundToDay": "Round to the day",
    "euiTimeOptions.roundToWeek": "Round to the week",
    "euiTimeOptions.roundToMonth": "Round to the month",
    "euiTimeOptions.roundToYear": "Round to the year",
    "euiPrettyDuration.lastDurationSeconds": ({ duration }: Record<string, unknown>) => `Last ${duration ?? ""} seconds`,
    "euiPrettyDuration.nextDurationSeconds": ({ duration }: Record<string, unknown>) => `Next ${duration ?? ""} seconds`,
    "euiPrettyDuration.lastDurationMinutes": ({ duration }: Record<string, unknown>) => `Last ${duration ?? ""} minutes`,
    "euiPrettyDuration.nextDurationMinutes": ({ duration }: Record<string, unknown>) => `Next ${duration ?? ""} minutes`,
    "euiPrettyDuration.lastDurationHours": ({ duration }: Record<string, unknown>) => `Last ${duration ?? ""} hours`,
    "euiPrettyDuration.nextDurationHours": ({ duration }: Record<string, unknown>) => `Next ${duration ?? ""} hours`,
    "euiPrettyDuration.lastDurationDays": ({ duration }: Record<string, unknown>) => `Last ${duration ?? ""} days`,
    "euiPrettyDuration.nexttDurationDays": ({ duration }: Record<string, unknown>) => `Next ${duration ?? ""} days`,
    "euiPrettyDuration.lastDurationWeeks": ({ duration }: Record<string, unknown>) => `Last ${duration ?? ""} weeks`,
    "euiPrettyDuration.nextDurationWeeks": ({ duration }: Record<string, unknown>) => `Next ${duration ?? ""} weeks`,
    "euiPrettyDuration.lastDurationMonths": ({ duration }: Record<string, unknown>) => `Last ${duration ?? ""} months`,
    "euiPrettyDuration.nextDurationMonths": ({ duration }: Record<string, unknown>) => `Next ${duration ?? ""} months`,
    "euiPrettyDuration.lastDurationYears": ({ duration }: Record<string, unknown>) => `Last ${duration ?? ""} years`,
    "euiPrettyDuration.nextDurationYears": ({ duration }: Record<string, unknown>) => `Next ${duration ?? ""} years`,
    "euiDatePopoverContent.startDateLabel": "Start date",
    "euiDatePopoverContent.endDateLabel": "End date",
    "euiDatePopoverContent.absoluteTabLabel": "Absolute",
    "euiDatePopoverContent.relativeTabLabel": "Relative",
    "euiDatePopoverContent.nowTabLabel": "Now",
    "euiDatePopoverContent.nowTabContent":
      "Setting the time to now means this value is recalculated on every refresh.",
    "euiDatePopoverContent.nowTabButtonStart": "Set start date and time to now",
    "euiDatePopoverContent.nowTabButtonEnd": "Set end date and time to now",
    "euiRelativeTab.numberInputLabel": "Time span value",
    "euiRelativeTab.numberInputError": "Must be greater than or equal to 0",
    "euiRelativeTab.dateInputError": "Enter a valid time range",
    "euiRelativeTab.unitInputLabel": "Relative time unit",
    "euiRelativeTab.fullDescription": ({ unit }: Record<string, unknown>) => `Current unit is ${unit ?? ""}`,
    "euiAbsoluteTab.dateFormatButtonLabel": "Parse date",
    "euiAbsoluteTab.dateFormatError": ({ dateFormat }: { dateFormat?: ReactNode }) => (
      <>Supported formats: {dateFormat}, ISO 8601, RFC 2822, or Unix timestamp.</>
    ),
    "euiSuperUpdateButton.updatingButtonLabel": "Updating",
    "euiSuperUpdateButton.updateButtonLabel": "Update",
    "euiSuperUpdateButton.refreshButtonLabel": "Refresh",
    "euiSuperUpdateButton.cannotUpdateTooltip": "Cannot update",
    "euiSuperUpdateButton.clickToApplyTooltip": "Click to apply"
  }
};

if (publicPathRedirectHref) {
  window.location.replace(publicPathRedirectHref);
} else {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <CustomProvider locale={zhCN}>
      <EuiProvider colorMode="light" globalStyles={false} utilityClasses={false}>
        <EuiContext i18n={euiI18n}>
          <RouterProvider router={router} />
        </EuiContext>
      </EuiProvider>
    </CustomProvider>
  );
}
