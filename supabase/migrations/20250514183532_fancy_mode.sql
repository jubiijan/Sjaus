/*
  # Remove reports functionality
  
  1. Changes
    - Drop reports table
    - Remove related foreign keys and constraints
*/

-- Drop the reports table and all its dependencies
DROP TABLE IF EXISTS reports;

-- Drop the function used for updating timestamps
DROP FUNCTION IF EXISTS update_updated_at_column();