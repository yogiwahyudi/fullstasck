# Songs with Sales are retired, not deleted

Customers own a Song through a Sale, so hard-deleting a Song would silently take away something they paid for. An Admin "delete" of a Song that has Sales therefore retires it: it leaves the public Catalogue but stays in owners' Libraries and stays downloadable. Only a Song with no Sales is actually deleted. Pending Orders for a retired Song remain payable.

## Considered Options

- **Hard-delete and keep only the Sale snapshot** (the original behavior): simple, but owners lose access to Songs they paid for.
