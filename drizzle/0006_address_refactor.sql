-- Refactor enderecoEntrega to 3 structured fields
ALTER TABLE `pedidos` 
DROP COLUMN `enderecoEntrega`,
ADD COLUMN `ruaEntrega` varchar(255) NOT NULL AFTER `dataEntrega`,
ADD COLUMN `bairroEntrega` varchar(120) NOT NULL AFTER `ruaEntrega`,
ADD COLUMN `numeroEntrega` varchar(20) NOT NULL AFTER `bairroEntrega`;
