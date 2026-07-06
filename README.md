# Cash Organizer — Functions (Firebase)

Configurações de backend do Cash Organizer: **Firestore rules**, **indexes** e
**Cloud Functions**, com pipeline de deploy automático para o Firebase.

O frontend fica no repositório `cash-organizer-web` e conversa diretamente com o
Firestore — este repositório é a fonte da verdade das regras de segurança e das
functions.

## Estrutura

```
firebase.json            configuração do projeto (firestore + functions + emuladores)
.firebaserc              alias do projeto (troque pelo id do seu projeto p/ uso local)
firestore.rules          regras de segurança do Firestore
firestore.indexes.json   índices compostos (nenhum necessário por enquanto)
functions/               Cloud Functions (TypeScript, Node 22, região southamerica-east1)
```

### Functions

| Função | Tipo | Descrição |
| --- | --- | --- |
| `ping` | HTTPS | Health check simples. |
| `onExpenseWritten` | Trigger Firestore | Mantém o agregado `varActualCached` (total dos gastos variáveis, em centavos) no documento do mês a cada lançamento criado/alterado/removido. |

> **Nota:** o deploy de Cloud Functions exige o plano **Blaze** no projeto
> Firebase. As rules e indexes funcionam em qualquer plano — se ainda estiver no
> plano gratuito, troque o `--only firestore,functions` do workflow por
> `--only firestore` até fazer o upgrade.

### Regras de segurança

O app não usa Firebase Auth: o acesso é protegido pelo conhecimento do nome +
senha do compartimento (o cliente valida o hash SHA-256 armazenado). As regras:

- bloqueiam `list` na coleção `compartments` (não dá para enumerar compartimentos);
- tornam o `passwordHash` e o nome do compartimento imutáveis;
- validam a estrutura básica dos documentos (tipos, valores em centavos >= 0 etc.).

## Desenvolvimento local

```bash
cd functions
npm install
npm run build

# emuladores (na raiz do repo, com o firebase-tools instalado)
npx firebase-tools emulators:start
```

## Deploy (GitHub Actions)

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) roda a
cada push na `main` e executa:

```
firebase deploy --only firestore,functions --project $FIREBASE_PROJECT_ID
```

Secrets necessárias em **Settings → Secrets and variables → Actions**:

| Secret | Conteúdo |
| --- | --- |
| `FIREBASE_PROJECT_ID` | O id do projeto no Firebase (ex.: `cash-organizer-a1b2c`). |
| `FIREBASE_SERVICE_ACCOUNT` | O JSON completo de uma service account com permissão de deploy. No Console do Google Cloud: **IAM & Admin → Service Accounts → Create**, com os papéis **Firebase Admin** e **Service Account User** (ou use a service account `firebase-adminsdk` do projeto) → **Keys → Add key → JSON**. Cole o conteúdo do arquivo inteiro na secret. |
