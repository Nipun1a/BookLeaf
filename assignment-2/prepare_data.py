"""Prepare exact Assignment 1 sample records for the Bubble assignment.

Run: python assignment-2/prepare_data.py
No credentials are generated and no remote requests are made.
"""
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / 'bookleaf_sample_data (1).json'
OUT = ROOT / 'data'


def write_csv(name, rows):
    with (OUT / name).open('w', newline='', encoding='utf-8-sig') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def main():
    authors = json.loads(SOURCE.read_text(encoding='utf-8'))['authors']
    OUT.mkdir(parents=True, exist_ok=True)
    profiles, books, royalties, totals = [], [], [], []
    seen_authors, seen_books = set(), set()
    for author in authors:
        assert author['author_id'] not in seen_authors
        seen_authors.add(author['author_id'])
        profiles.append({key: value for key, value in author.items() if key != 'books'})
        total = {'author_id': author['author_id'], 'name': author['name'], 'book_count': len(author['books']), 'earned': 0, 'paid': 0, 'pending': 0}
        for book in author['books']:
            assert book['book_id'] not in seen_books
            seen_books.add(book['book_id'])
            assert book['total_royalty_earned'] == book['royalty_paid'] + book['royalty_pending']
            numeric = ['total_copies_sold', 'total_royalty_earned', 'royalty_paid', 'royalty_pending']
            assert all(isinstance(book[key], (int, float)) and book[key] >= 0 for key in numeric)
            books.append({
                'book_id': book['book_id'], 'author_id': author['author_id'],
                **{key: book[key] for key in ['title', 'isbn', 'genre', 'publication_date', 'status', 'mrp', 'author_royalty_per_copy', 'print_partner']},
                'available_on': '|'.join(book['available_on'])
            })
            royalties.append({
                'snapshot_id': 'SNAP-' + book['book_id'],
                'book_id': book['book_id'], 'author_id': author['author_id'],
                **{key: book[key] for key in numeric + ['last_royalty_payout_date']}
            })
            total['earned'] += book['total_royalty_earned']
            total['paid'] += book['royalty_paid']
            total['pending'] += book['royalty_pending']
        totals.append(total)
        fixture = {
            'request_id': 'fixture-' + author['author_id'],
            'notification_id': 'REPLACE_WITH_BUBBLE_NOTIFICATION_ID',
            'author': author
        }
        (OUT / (author['author_id'] + '-request.json')).write_text(json.dumps(fixture, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    assert len(profiles) == 10 and len(books) == 18 and len(royalties) == 18
    assert sum(total['pending'] > 0 for total in totals) == 9
    assert next(total for total in totals if total['author_id'] == 'AUTH001')['pending'] == 3570
    write_csv('authors.csv', profiles)
    write_csv('books.csv', books)
    write_csv('royalty-snapshots.csv', royalties)
    write_csv('expected-author-totals.csv', totals)
    manifest = {
        'source': SOURCE.name, 'source_sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'authors': len(profiles), 'books': len(books), 'royalty_snapshots': len(royalties),
        'bulk_eligible_author_ids': [row['author_id'] for row in totals if row['pending'] > 0],
        'note': 'CSV author_id/book_id fields are external identifiers. Resolve them to Bubble relationships after parent records are created. Fixtures are not completed notifications.'
    }
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print('Validated 10 authors, 18 books, 18 snapshots, 9 bulk-eligible authors. Prepared local CSV and request fixtures.')


if __name__ == '__main__':
    main()
