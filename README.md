# ELORA — marketplace de produtos e serviços

A Elora conecta compradores, vendedores e prestadores de serviço em uma única plataforma. A aplicação usa Java 21, Spring Boot e PostgreSQL no servidor, com páginas HTML, CSS e JavaScript servidas pelo próprio backend.

## Requisitos

- JDK 21 e Maven 3.8+
- Docker Desktop para a execução completa local com Docker Compose
- PostgreSQL local ou uma instância PostgreSQL compatível, como Neon

## Configuração segura

Copie `.env.example` para `backend/.env` e preencha `DB_URL`, `DB_USERNAME` e `DB_PASSWORD` com as credenciais do banco. Defina `JWT_SECRET` com pelo menos 32 bytes aleatórios. Esse arquivo é ignorado pelo Git e não deve ser enviado ao repositório. Gere uma senha nova no Neon sempre que uma credencial tiver sido compartilhada.

Exemplo para segredo JWT no PowerShell (gere o valor localmente; não o publique):

```powershell
$bytes = [byte[]]::new(48)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Para Neon, use a URL JDBC `jdbc:postgresql://HOST/neondb?sslmode=require&channel_binding=require`. O Hibernate atualiza o esquema com `ddl-auto=update`; não apaga tabelas nem registros existentes. Faça backup antes de qualquer mudança estrutural importante.

## Executar localmente

Com o PostgreSQL local do Compose:

```powershell
docker compose up --build
```

Acesse `http://localhost:8080`. A página inicial e os arquivos estáticos são servidos pelo Spring Boot no mesmo domínio das rotas `/api`.

Para rodar o backend fora do Docker, inicie o PostgreSQL (ou configure o Neon em `backend/.env`) e execute:

```powershell
cd backend
mvn spring-boot:run
```

Se abrir o frontend com Live Server, Vite ou outro servidor estático local nas portas 3000, 5173, 5174, 5500 ou 5501, o cliente aponta automaticamente para `http://localhost:8080/api`; o backend Spring precisa estar rodando. Se hospedar frontend e API em domínios diferentes, preencha `window.ELORA_API_URL` em `frontend/js/config.js` com a URL pública da API e configure `ELORA_ALLOWED_ORIGINS` no backend com a origem do frontend. Quando o Spring Boot serve o frontend no mesmo domínio, mantenha o padrão `/api`.

Para usar o H2 local antigo, inicie com o perfil `h2`:

```powershell
cd backend
mvn spring-boot:run "-Dspring-boot.run.arguments=--spring.profiles.active=h2"
```

O arquivo de banco H2 existente permanece preservado. A ferramenta de migração H2 → PostgreSQL só deve ser executada intencionalmente, uma vez e em um banco de destino vazio:

```powershell
cd backend
mvn spring-boot:run "-Dspring-boot.run.arguments=--elora.migration.h2-to-postgres.enabled=true"
```

## Publicação

O backend já inclui o frontend no JAR, então publique um único serviço web construído a partir da raiz deste repositório com `backend/Dockerfile`. Configure as variáveis `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` e `JWT_SECRET` no painel de variáveis seguras do provedor. Para Neon, use a URL JDBC acima e mantenha TLS (`sslmode=require`). Use `/` como verificação HTTP básica. Não publique `backend/.env` nem credenciais no Docker image.

O banco Neon já pode ser usado pelo backend após a configuração; criar uma instância Neon por si só não publica a aplicação. A publicação do serviço exige uma plataforma de hospedagem e suas variáveis de ambiente.

## Funcionalidades

- Cadastro e login com JWT, perfil público/privado e atualização de senha.
- Catálogo separado para produtos e serviços, pesquisa paginada, filtros e categorias.
- Publicação, edição, pausa, reativação e remoção lógica de anúncios.
- Detalhe de produto/serviço, perfil do anunciante, favoritos e mensagens persistidas.
- Carrinho local com painel lateral, quantidades e resumo; checkout cria pedidos persistidos e valida o estoque no servidor.
- Acompanhamento de pedidos e vendas, solicitações de serviço, avaliações e painel de conta.

## Testes

```powershell
cd backend
mvn test
```

Os testes de integração usam banco H2 em memória e não acessam o Neon.

## Estrutura

```text
backend/   API Spring Boot, segurança, persistência e testes
frontend/  HTML, CSS e JavaScript sem framework
scripts/   utilitários de desenvolvimento
```
