/**
 * One optional, fixed preparation activity — spec section 5 step 5 (AC-17).
 * Default: none. Status Not yet / Tried it / Couldn't try it, plus notes.
 */
import type { ActivityId, ActivityStatus } from '@my-childs-story/shared';
import { ACTIVITIES, ACTIVITY_NOTE, ACTIVITY_STATUS_LABELS } from '../content/activities';
import type { ActivityResponse } from '../draft/draft';

type Props = {
  activity: ActivityResponse | null;
  onChange: (activity: ActivityResponse | null) => void;
};

const STATUSES = Object.keys(ACTIVITY_STATUS_LABELS) as ActivityStatus[];

export function ActivityPicker({ activity, onChange }: Props) {
  const choose = (id: ActivityId | 'none') => {
    if (id === 'none') onChange(null);
    // Switching activity keeps status and notes the parent already wrote.
    else onChange({ activityId: id, status: activity?.status ?? 'not_yet', notes: activity?.notes ?? '' });
  };

  return (
    <section className="activity" aria-labelledby="activity-heading">
      <h3 id="activity-heading">One small activity (optional)</h3>
      <p className="hint" id="activity-note">
        {ACTIVITY_NOTE}
      </p>
      <fieldset className="plain-fieldset" aria-describedby="activity-note">
        <legend className="visually-hidden">Choose an activity</legend>
        <div className="option-list">
          <label className="choice choice-block">
            <input
              type="radio"
              name="activity"
              value="none"
              checked={activity === null}
              onChange={() => choose('none')}
            />
            <span>No activity</span>
          </label>
          {ACTIVITIES.map((a) => (
            <label key={a.id} className="choice choice-block">
              <input
                type="radio"
                name="activity"
                value={a.id}
                checked={activity?.activityId === a.id}
                onChange={() => choose(a.id)}
              />
              <span>
                {a.title}
                {a.instructions && <span className="hint choice-detail">{a.instructions}</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {activity && (
        <>
          <fieldset className="plain-fieldset">
            <legend className="field-legend">How did it go?</legend>
            <div className="choice-row">
              {STATUSES.map((status) => (
                <label key={status} className="choice">
                  <input
                    type="radio"
                    name="activity-status"
                    value={status}
                    checked={activity.status === status}
                    onChange={() => onChange({ ...activity, status })}
                  />
                  <span>{ACTIVITY_STATUS_LABELS[status]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="activity-notes">Notes (optional)</label>
            <textarea
              id="activity-notes"
              rows={3}
              value={activity.notes}
              onChange={(e) => onChange({ ...activity, notes: e.target.value })}
            />
          </div>
        </>
      )}
    </section>
  );
}
