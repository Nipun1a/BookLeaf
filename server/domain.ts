export const categories = ['Royalty & Payments','ISBN & Metadata Issues','Printing & Quality','Distribution & Availability','Book Status & Production Updates','General Inquiry'] as const;
export const priorities = ['Critical','High','Medium','Low'] as const;
export const statuses = ['Open','In Progress','Resolved','Closed'] as const;
export type Book = {book_id:string;title:string;isbn:string;genre:string;publication_date:string|null;status:string;mrp:number|null;author_royalty_per_copy:number|null;total_copies_sold:number;total_royalty_earned:number;royalty_paid:number;royalty_pending:number;last_royalty_payout_date:string|null;print_partner:string|null;available_on:string[]};
export type Author = {author_id:string;name:string;email:string;phone:string;city:string;joined_date:string;books:Book[]};
export type User = {id:string;name:string;email:string;role:'author'|'admin'};
export type Ticket = {id:string;author_id:string;book_id:string|null;subject:string;description:string;category:typeof categories[number];priority:typeof priorities[number];status:typeof statuses[number];assigned_to:string|null;created_at:string;updated_at:string;ai_source:string;ai_draft:string;author_name?:string;book_title?:string};
