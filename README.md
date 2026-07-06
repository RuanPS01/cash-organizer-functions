# Cash Organizer — Backend Firebase (Firestore)

Configurações de backend do Cash Organizer: **Firestore rules** e **indexes**, com
pipeline de deploy automático para o Firebase.

O app roda 100% no frontend (repositório `cash-organizer-web`), conversando
diretamente com o Firestore — **toda a lógica de funcionamento fica no web app**,
e este repositório é a fonte da verdade das regras de segurança. Não há Cloud
Functions, então tudo funciona no **plano gratuito (Spark)** do Firebase.

## Estrutura

```
firebase.json            configuração do projeto (firestore + emulador)
.firebaserc              alias do projeto (troque pelo id do seu projeto p/ uso local)
firestore.rules          regras de segurança do Firestore
firestore.indexes.json   índices compostos (nenhum necessário por enquanto)
```

### Regras de segurança

O app não usa Firebase Auth: o acesso é protegido pelo conhecimento do nome +
senha do compartimento (o cliente valida o hash SHA-256 armazenado). As regras:

- bloqueiam `list` na coleção `compartments` (não dá para enumerar compartimentos);
- tornam o `passwordHash` e o nome do compartimento imutáveis;
- validam a estrutura básica dos documentos (tipos, valores em centavos >= 0 etc.).

## Desenvolvimento local

```bash
# emulador do Firestore com as rules deste repo
npx firebase-tools emulators:start
```

## Deploy (GitHub Actions)

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) roda a
cada push na `main` e executa:

```
firebase deploy --only firestore --project $FIREBASE_PROJECT_ID
```

Secrets necessárias em **Settings → Secrets and variables → Actions**:

| Secret | Conteúdo |
| --- | --- |
| `FIREBASE_PROJECT_ID` | O id do projeto no Firebase (ex.: `cash-organizer-a1b2c`). |
| `FIREBASE_SERVICE_ACCOUNT` | O JSON completo de uma chave de service account com permissão de deploy (**Service Accounts → Keys → Add key → JSON**). Cole o conteúdo do arquivo inteiro na secret. |

### Papéis (IAM) da service account

A service account usada no deploy (pode ser a `firebase-adminsdk` do projeto)
precisa dos papéis abaixo em **IAM & Admin → IAM → editar principal**:

| Papel | Motivo |
| --- | --- |
| **Firebase Admin** (`roles/firebase.admin`) | Deploy das rules e indexes do Firestore. |
| **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`) | O firebase-tools checa se as APIs do projeto estão habilitadas; sem isso o deploy falha com `403 Permission denied to get service [firestore.googleapis.com]`. |

## E se um dia eu precisar de Cloud Functions?

Functions exigem o plano Blaze. Se o projeto for atualizado no futuro, basta
recriar o diretório `functions/` (o histórico deste repositório tem uma versão
funcional em TypeScript), voltar o bloco `functions` no `firebase.json` e trocar
o `--only firestore` do workflow por `--only firestore,functions` — além de
adicionar o papel **Service Account User** à service account e habilitar as APIs
`cloudfunctions`, `cloudbuild`, `artifactregistry`, `eventarc`, `run` e `pubsub`.
