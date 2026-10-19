CREATE OR REPLACE FUNCTION public.grant_owner_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'anujkumar75yadav@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER owner_admin_on_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.grant_owner_admin();
INSERT INTO public.user_roles (user_id, role) SELECT id, 'admin' FROM auth.users WHERE lower(email) = 'anujkumar75yadav@gmail.com' ON CONFLICT DO NOTHING;