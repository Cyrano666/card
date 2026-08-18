export type Profile={id:string;household_id:string|null;display_name:string;role:'owner'|'member'}
export type Task={id:string;household_id:string;title:string;description:string|null;schedule:'daily'|'weekdays'|'once';due_time:string|null;active:boolean;created_by:string;created_at:string}
export type Checkin={id:string;task_id:string;user_id:string;checkin_date:string;note:string|null;photo_url:string|null;created_at:string;profiles?:{display_name:string}|null}
