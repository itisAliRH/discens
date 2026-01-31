-- Recreate the handle_new_user function with error logging
-- This will help us see what's failing

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log that we're entering the function
  RAISE LOG 'handle_new_user: Starting for user %', NEW.id;
  
  BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      NEW.raw_user_meta_data->>'avatar_url'
    );
    RAISE LOG 'handle_new_user: Profile created for user %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: Profile creation FAILED for user % - %', NEW.id, SQLERRM;
    RAISE EXCEPTION 'Profile creation failed: %', SQLERRM;
  END;
  
  BEGIN
    -- Create memory container
    INSERT INTO public.memories (user_id)
    VALUES (NEW.id);
    RAISE LOG 'handle_new_user: Memory created for user %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: Memory creation FAILED for user % - %', NEW.id, SQLERRM;
    RAISE EXCEPTION 'Memory creation failed: %', SQLERRM;
  END;
  
  BEGIN
    -- Create streak record
    INSERT INTO public.streaks (user_id)
    VALUES (NEW.id);
    RAISE LOG 'handle_new_user: Streak created for user %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: Streak creation FAILED for user % - %', NEW.id, SQLERRM;
    RAISE EXCEPTION 'Streak creation failed: %', SQLERRM;
  END;
  
  RAISE LOG 'handle_new_user: Completed successfully for user %', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger with explicit schema
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Verify
SELECT 'Trigger recreated successfully' as status;
