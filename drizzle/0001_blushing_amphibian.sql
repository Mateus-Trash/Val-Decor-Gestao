CREATE TABLE `clientes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`contato` varchar(20),
	`email` varchar(320),
	`observacoesInternas` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clientes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `colaboradores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`telefone` varchar(20),
	`funcao` varchar(100),
	`percentualComissao` int NOT NULL DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `colaboradores_id` PRIMARY KEY(`id`),
	CONSTRAINT `colaboradores_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `comissoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`colaboradorId` int NOT NULL,
	`pedidoId` int NOT NULL,
	`valor` int NOT NULL,
	`dataCalculo` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comissoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `entregasColetas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pedidoId` int NOT NULL,
	`colaboradorId` int,
	`tipo` enum('entrega','coleta') NOT NULL,
	`dataAgendada` timestamp NOT NULL,
	`dataRealizada` timestamp,
	`status` enum('agendado','em_rota','concluido','cancelado') NOT NULL DEFAULT 'agendado',
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `entregasColetas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`valorAluguel` int NOT NULL,
	`custoAquisicao` int,
	`quantidadeTotal` int NOT NULL,
	`quantidadeDisponivel` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `itens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itensPedido` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pedidoId` int NOT NULL,
	`itemId` int NOT NULL,
	`quantidade` int NOT NULL,
	`valorUnitario` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `itensPedido_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kitItens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kitId` int NOT NULL,
	`itemId` int NOT NULL,
	`quantidade` int NOT NULL,
	CONSTRAINT `kitItens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`valorAluguel` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kitsPedido` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pedidoId` int NOT NULL,
	`kitId` int NOT NULL,
	`quantidade` int NOT NULL DEFAULT 1,
	`valorUnitario` int NOT NULL,
	CONSTRAINT `kitsPedido_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pedidos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clienteId` int,
	`colaboradorId` int NOT NULL,
	`dataEvento` timestamp NOT NULL,
	`dataEntrega` timestamp NOT NULL,
	`dataColeta` timestamp NOT NULL,
	`enderecoEntrega` text,
	`valorTotal` int NOT NULL,
	`valorTaxaEntrega` float NOT NULL DEFAULT 0,
	`status` enum('Pendente','Confirmado','Em Preparacao','Entregue','Concluido') NOT NULL DEFAULT 'Pendente',
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pedidos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transacoesFinanceiras` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pedidoId` int,
	`tipo` enum('receita','despesa','taxa_entrega') NOT NULL,
	`descricao` text,
	`valor` int NOT NULL,
	`data` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transacoesFinanceiras_id` PRIMARY KEY(`id`)
);
