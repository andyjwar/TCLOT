# Wrong GitHub account

**Do not use this repo.** The live TCLOT site is:

**https://github.com/andyjwa/tclot**  
Site: https://tclot.vercel.app

This `andyjwar/TCLOT` copy (extra **r** in the login) is not production. Open Cloud Agents from `andyjwa/tclot`. Install the Cursor GitHub App on that repo so merges go there.

To apply the UI that landed here by mistake, on a clone of **andyjwa/tclot**:

```bash
git fetch https://github.com/andyjwar/TCLOT.git cursor/port-ui-to-andyjwa-d1a4
git merge FETCH_HEAD
git push origin main
```
