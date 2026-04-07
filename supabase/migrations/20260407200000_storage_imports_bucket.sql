-- =============================================================================
-- Crea el bucket de Storage 'imports' usado por la Edge Function import-excel.
-- Bucket privado: solo accesible vía service_role o políticas explícitas.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('imports', 'imports', false)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Políticas opcionales para usuarios autenticados:
--   - Subir archivos a su propia carpeta ({user_id}/...)
--   - Leer únicamente sus propios archivos
-- La Edge Function usa service_role y no se ve afectada por estas políticas.
-- -----------------------------------------------------------------------------

create policy "imports_authenticated_upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "imports_authenticated_read_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'imports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
