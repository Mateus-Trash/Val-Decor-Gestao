-- Migrate existing data before altering the enum
UPDATE `pedidos` SET `status` = 'Confirmado' WHERE `status` = 'Em Preparacao';
UPDATE `pedidos` SET `status` = 'EntregueNaoPago' WHERE `status` = 'Entregue';

-- Alter the enum column to the new values
ALTER TABLE `pedidos` MODIFY COLUMN `status` enum('Pendente','Confirmado','EntregueNaoPago','EntreguePago','Concluido') NOT NULL DEFAULT 'Pendente';
