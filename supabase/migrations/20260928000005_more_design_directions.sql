-- =============================================================================
-- Two more design directions (design kit 1.2.0): Street poster and Quiet luxury.
-- =============================================================================
alter type public.design_direction add value if not exists 'poster';
alter type public.design_direction add value if not exists 'quiet';
