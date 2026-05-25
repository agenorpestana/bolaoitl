# Bolão Provedor - Copa do Mundo 2026 🏆

Sistema web completo, moderno, responsivo e profissional de palpites (Bolão) da Copa do Mundo 2026 pensado sob medida para **Provedores de Internet (ISP)** realizarem campanhas de engajamento e fidelização de marca junto a seus clientes, com validação de contrato automática integrada ao **IXC Soft**.

O sistema possui um funcionamento ágil e gamificado inspirado no Cartola FC, SofaScore e ESPN, sendo totalmente gratuito para os clientes cadastrados ativos em dia no provedor.

---

## 📸 Estrutura de Funcionalidades

### Área Pública e de Clientes
*   **Banner Esportivo Copa 2026 & Cronômetro Dinâmico**: Cronômetro regressivo com contagem regressiva para a abertura da Copa.
*   **Acesso Simplificado CPF/CNPJ (Sem senha)**: O cliente informa seu CPF/CNPJ. O sistema valida na hora via módulo de integração IXC e concede acesso criando perfil na hora com a cidade associada ao contrato.
*   **Painel Interativo de Palpites**: Interface otimizada do SofaScore para informar e salvar palpites. Estrito bloqueio de novos palpites **1 hora antes do início configurado da partida** (evita fraudes baseadas no horário local do cliente).
*   **Sistema de Medalhas & Gamificação**: Atribuição de insígnias visuais para engajamento ("Mestre do Placar", "Palpiteiro Fiel").
*   **Classificação & Podium de Honra**: Rankings divididos por colocação, filtros de município e sistema inteligente de desempates.

### Área Administrativa (Superusuário Unity)
*   **Métricas & KPIs Consolidados**: Contador de palpiteiros cadastrados, palpites totais e barras dinâmicas de dispersão de pontos.
*   **Gerenciador de Partidas Copa**: Painel para cadastramento de novos jogos, edição, remoção e inserção de resultados de placares. O encerramento de um jogo aciona o cálculo de pontos automático para toda a base.
*   **Gestão de Participantes**: Listagem de palpiteiros com busca ativa, controle de bloqueio manual de fraudes, resetadores de pontuação e edições rápidas.
*   **Configuração Técnica IXC Soft**: Definição de URLs webservice, tokens de acesso basic, chaves, timeouts e botão de teste de conectividade com logs de auditoria detalhados.
*   **Configuração de Pontuação de Regras**: Edite de forma visual o tamanho das recompensas (Exemplo: acertos vitoriosos, placar exato, bônus de rodadas completas).
*   **API Football Sync**: Integração com servidor API-SPORTS para ler jogos e status de placares em tempo real de forma automática.
*   **Relatórios & Exportadores**: Extraia planilhas CSV formatadas de todos os utilizadores, partidas e engajamento para excel, ou clique no botão de impressão amigável para PDF.
*   **Trilha de Auditoria Geral**: Logs persistentes monitorando cada evento administrativo e acessos de IPs.

---

## 🛠️ Credenciais Padrão do Painel Admin
Para acessar a retaguarda administrativa, clique em "Login Participante" e no rodapé selecione *"Acesso Administrativo 🔑"*:
*   **Usuário/E-mail:** `suporte@unityautomacoes.com.br`
*   **Senha:** `200616`

---

## 🐳 Instruções de Instalação Rápida com Docker

O sistema já está totalmente configurado para deploy com múltiplos contêineres unindo o frontend React compilado, servidor Express API, banco de dados MySQL 8.0 e Servidor reverso seguro NGINX com compressão Gzip.

### Pré-requisitos
Certifique-se de ter instalado em sua máquina ou servidor VPS:
1.  **Docker** (v20+)
2.  **Docker Compose**

### Executando em Produção
1.  Clone esta estrutura no diretório `/var/www/bolao-copa` de seu servidor VPS.
2.  Gere seus certificados SSL e coloque-os no diretório `./certs` (Exemplo: `fullchain.pem` e `privkey.pem`). Caso queira rodar local apenas em desenvolvimento, comente a seção SSL do arquivo `nginx.conf`.
3.  Crie as variáveis de ambiente completas no arquivo `.env` (baseado no `.env.example`).
4.  Inicie as pilhas de contêineres em modo desacoplado:
    ```bash
    docker compose up -d --build
    ```
5.  Acompanhe a subida dos servidores e o provisionamento do banco de dados MySQL:
    ```bash
    docker compose logs -f
    ```
O Nginx iniciará e passará a escutar nas portas 80/443 redirecionando e gerenciando o tráfego de forma otimizada para o app Express na porta 3000.

---

## ⚡ Deploy Automatizado via Script Unity Multi-SaaS (VPS Option 12)

O sistema possui integração pronta com o seu script de gerenciamento multi-SaaS da Unity (`gerenciar.sh`). Ele foi condicionado na **Opção 12** rodando na **Porta 3011**:

1. Copie o script `gerenciar.sh` da raiz deste repositório para o seu servidor VPS.
2. Dê permissão de execução ao script:
   ```bash
   sudo chmod +x gerenciar.sh
   ```
3. Execute o script como root:
   ```bash
   sudo ./gerenciar.sh
   ```
4. Selecione a opção **1) Instalar ou Atualizar um Sistema** e, em seguida, defina a opção **12) Bolão da Copa - Provedor ISP (Porta 3011)**.
5. Siga as instruções do script inserindo o domínio de produção, as credenciais MySQL e a URL de clone do GitHub do bolão. Ele lidará de forma automática com:
   * Criação do banco de dados MySQL e do usuário.
   * Clone e build do bundle de produção do React + Express (`npm run build` gerando `dist/server.cjs`).
   * Configuração das chaves criptográficas JWT e arquivo de ambiente `.env`.
   * Inicialização persistente no processo **PM2** (`bolao-copa-api-seu-dominio`).
   * Roteamento reverso, regras `/api`, e suporte para uploads pelo **Nginx**.
   * SSL grátis emitido e renovado de forma automática via **Certbot Let's Encrypt**.

---

## ☁️ Deploy Manual em VPS Ubuntu (Sem Docker)

Se preferir rodar em um servidor Ubuntu limpo usando Node.js instalado localmente:

1.  **Instalar Node.js 20 & MySQL Server**:
    ```bash
    sudo apt update
    sudo apt install -y nodejs npm mysql-server nginx
    ```
2.  **Configurar Banco de Dados**:
    Acesse o MySQL e crie o schema e usuário:
    ```sql
    CREATE DATABASE copa_bolao_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE USER 'copa_user'@'localhost' IDENTIFIED BY 'MinhaSenhaSeguraCopa2026';
    GRANT ALL PRIVILEGES ON copa_bolao_db.* TO 'copa_user'@'localhost';
    FLUSH PRIVILEGES;
    ```
3.  **Configurar Prisma e Migrations**:
    No diretório do projeto, execute as migrations para estruturar o banco:
    ```bash
    npm install
    npx prisma migrate deploy
    ```
4.  **Compilar e Rodar**:
    ```bash
    npm run build
    npm run start
    ```
5.  **Configurar PM2** para manter o serviço Node.js sempre ativo em segundo plano:
    ```bash
    sudo npm install -y -g pm2
    pm2 start dist/server.cjs --name "bolao-worldcup"
    pm2 save
    pm2 startup
    ```

---

## 🗄️ Procedimentos de Backup & Restore de Dados

Garanta a continuidade dos palpites dos seus clientes executando backups agendados.

### Backup do Banco de Dados MySQL
Para extrair um dump completo de todas as tabelas (utilizadores, palpites, logs de auditoria):
```bash
docker exec -t bolao_copa_db mysqldump -u copa_user -pcopa_secure_pass_2026 copa_bolao_db > backup_bolao_copa_$(date +%F).sql
```

### Restaurar Backup
Para restaurar o estado do banco a partir de um backup SQL de auditoria:
```bash
docker exec -i bolao_copa_db mysql -u copa_user -pcopa_secure_pass_2026 copa_bolao_db < backup_bolao_copa_XXXX-XX-XX.sql
```

---

## 🔧 Integração Técnica: API IXC Soft Curl Exemplo

A validação consulta o endpoint `/webservice/v1/cliente` usando o cabeçalho personalizado `ixcsoft: listar` com autenticação baseada em token em hash base64. O fluxo foi construído utilizando Axios no backend server:

```typescript
const payload = {
  qtype: "cliente.cnpj_cpf",
  query: cpf_cnpj_inserido,
  oper: "equal",
  rp: "1",
  sortname: "cliente.id",
  sortorder: "desc"
};
```
Quando o cliente é encontrado, o sistema extrai o ID cadastrado, Razão Social, Cidade de residência contrária e telefone móvel para criar automaticamente um acesso unificado no banco de dados e dar as boas-vindas ao utilizador.
