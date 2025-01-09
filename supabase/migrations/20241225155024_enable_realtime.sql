-- Enable realtime for ideas table
alter publication supabase_realtime add table ideas;

-- Enable replication identifiers for realtime
alter table ideas replica identity full; 