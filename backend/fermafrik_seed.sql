-- Seed FermAfrik: utilisateurs, batiment, cycle, parametres
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

INSERT INTO `users` (`username`, `password_hash`, `role`) VALUES
  ('admin', '$2a$10$uT5kJ7RGqSkS3RZXeVBuieSNC2e246gRLPu1ERX7o1uoNtUlZTvAO', 'admin'),
  ('gestion', '$2a$10$TvPF01jxNV8ebBCUwxM3NuK.TtqHF71T.vzIHfV3noRleWAnulnx6', 'gestionnaire'),
  ('demo', '$2a$10$ccpJE7wv.d/2FgvQ1D8K9eFBe6JlH7pMMyMSXgmH9FnQGhVIGvSTO', 'demo');

INSERT INTO `buildings` (`name`, `capacity`, `status`) VALUES ('Batiment A', 600, 'active');

INSERT INTO `cycles` (`building_id`, `start_date`, `phase`, `initial_count`, `notes`) VALUES
  (1, '2025-07-17', 'production', 600, 'Cycle principal - demarre le 17 juillet 2025');

INSERT INTO `settings` (`key`, `value`, `updated_by`) VALUES
  ('prix_plaquette', '7000', 1),
  ('nom_ferme', 'FermAfrik', 1),
  ('devise', 'XOF', 1),
  ('oeufs_par_plaquette', '30', 1);

SET FOREIGN_KEY_CHECKS=1;