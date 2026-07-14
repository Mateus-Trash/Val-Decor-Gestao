DROP TABLE `clientes`;--> statement-breakpoint
ALTER TABLE `pedidos` ADD `nomeCliente` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `pedidos` DROP COLUMN `clienteId`;