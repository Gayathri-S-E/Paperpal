import fitz  # PyMuPDF
from pathlib import Path
from backend.config import SAMPLES_DIR

def create_sample_pdfs():
    """Generates realistic sample PDF documents for testing PaperPal."""
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Electricity / Utility Bill
    bill_path = SAMPLES_DIR / "sample_electricity_bill.pdf"
    if not bill_path.exists():
        doc = fitz.open()
        page = doc.new_page(width=595, height=842) # A4 size

        # Header
        page.insert_text((50, 60), "CITY POWER & LIGHT UTILITIES", fontsize=18, fontname="helv", color=(0.1, 0.2, 0.5))
        page.insert_text((50, 85), "Official Monthly Billing Statement — Account #9842-1084", fontsize=10, fontname="helv", color=(0.4, 0.4, 0.4))
        
        # Account summary block
        page.draw_rect(fitz.Rect(50, 110, 545, 200), color=(0.8, 0.8, 0.8), fill=(0.96, 0.97, 1.0), width=1)
        page.insert_text((70, 135), "Total Amount Due: $184.65 USD", fontsize=14, fontname="helv", color=(0.1, 0.1, 0.1))
        page.insert_text((70, 160), "Payment Due Date: October 25, 2026.", fontsize=12, fontname="helv", color=(0.8, 0.2, 0.2))
        page.insert_text((70, 182), "Billing Period: September 01, 2026 to September 30, 2026.", fontsize=10, fontname="helv")

        # Key Clauses
        page.insert_text((50, 230), "Important Customer Obligations and Billing Terms:", fontsize=13, fontname="helv", color=(0.1, 0.1, 0.1))
        
        terms = [
            "Payment must be received on or before October 25, 2026 to avoid interruption of electrical service.",
            "A late payment penalty fee of $25.00 or 1.5% of the outstanding balance will be assessed on unpaid accounts.",
            "Customers experiencing financial hardship shall submit an assistance application prior to October 20, 2026.",
            "Automatic monthly payment enrollment is subject to bank account verification within 3 business days.",
            "Any billing disputes must be submitted in writing within 60 days of the invoice date.",
            "Disconnection notices will be issued 10 days after missed deadlines without further grace period."
        ]
        
        y = 260
        for idx, term in enumerate(terms, start=1):
            page.insert_text((50, y), f"{idx}. {term}", fontsize=10, fontname="helv")
            y += 35

        # Breakdown Table
        page.draw_rect(fitz.Rect(50, y + 20, 545, y + 150), color=(0.8, 0.8, 0.8), fill=(0.98, 0.98, 0.98), width=1)
        page.insert_text((70, y + 45), "Electric Energy Usage (850 kWh @ $0.142/kWh): $120.70", fontsize=10, fontname="helv")
        page.insert_text((70, y + 70), "Grid Delivery & Distribution Infrastructure Surcharge: $42.50", fontsize=10, fontname="helv")
        page.insert_text((70, y + 95), "Municipal Clean Energy Regulatory Fee: $12.45", fontsize=10, fontname="helv")
        page.insert_text((70, y + 120), "State Environmental Surcharge & Taxes: $9.00", fontsize=10, fontname="helv")
        page.insert_text((70, y + 140), "Total Balance Payable: $184.65", fontsize=11, fontname="helv", color=(0.1, 0.4, 0.2))

        doc.save(str(bill_path))
        doc.close()

    # 2. Multi-page Residential Lease Agreement
    lease_path = SAMPLES_DIR / "sample_residential_lease.pdf"
    if not lease_path.exists():
        doc = fitz.open()
        
        # Page 1: Key Terms & Rent
        p1 = doc.new_page(width=595, height=842)
        p1.insert_text((50, 60), "STANDARD RESIDENTIAL LEASE AGREEMENT", fontsize=16, fontname="helv", color=(0.1, 0.2, 0.4))
        p1.insert_text((50, 85), "Document Page 1 of 2 — Binding Contract", fontsize=9, fontname="helv", color=(0.5, 0.5, 0.5))
        
        p1.insert_text((50, 120), "1. PARTIES AND PREMISES", fontsize=12, fontname="helv")
        p1.insert_text((50, 140), "This agreement is entered into between Oakridge Properties (Landlord) and the Tenant.", fontsize=10, fontname="helv")
        p1.insert_text((50, 160), "The leased premises is located at 742 Evergreen Terrace, Unit 4B, Springfield.", fontsize=10, fontname="helv")
        
        p1.insert_text((50, 200), "2. TERM AND RENT PAYMENT", fontsize=12, fontname="helv")
        p1.insert_text((50, 220), "The lease term commences on November 01, 2026 and expires on October 31, 2027.", fontsize=10, fontname="helv")
        p1.insert_text((50, 245), "Tenant agrees to pay monthly rent in the amount of $2,450.00 USD.", fontsize=10, fontname="helv")
        p1.insert_text((50, 270), "Rent must be paid on or before the 1st calendar day of each month.", fontsize=10, fontname="helv")
        p1.insert_text((50, 295), "If rent is not received by the 5th day of the month, a late fee of $125.00 shall apply.", fontsize=10, fontname="helv")
        
        p1.insert_text((50, 335), "3. SECURITY DEPOSIT OBLIGATIONS", fontsize=12, fontname="helv")
        p1.insert_text((50, 355), "Tenant shall provide a refundable security deposit of $3,000.00 upon lease signing.", fontsize=10, fontname="helv")
        p1.insert_text((50, 380), "The security deposit shall be held in an interest-bearing escrow account.", fontsize=10, fontname="helv")
        p1.insert_text((50, 405), "Landlord must return the security deposit within 21 days after tenant vacates the property.", fontsize=10, fontname="helv")
        p1.insert_text((50, 430), "Deductions may be made for property damages beyond ordinary wear and tear.", fontsize=10, fontname="helv")

        # Page 2: Maintenance, Termination & Pet Rules
        p2 = doc.new_page(width=595, height=842)
        p2.insert_text((50, 60), "RESIDENTIAL LEASE AGREEMENT (CONTINUED)", fontsize=16, fontname="helv", color=(0.1, 0.2, 0.4))
        p2.insert_text((50, 85), "Document Page 2 of 2 — Additional Clauses", fontsize=9, fontname="helv", color=(0.5, 0.5, 0.5))

        p2.insert_text((50, 120), "4. TERMINATION AND NOTICE", fontsize=12, fontname="helv")
        p2.insert_text((50, 145), "Either party may terminate this tenancy by providing 60 days written notice.", fontsize=10, fontname="helv")
        p2.insert_text((50, 170), "Early lease termination requires payment of an early cancellation fee of $1,500.00.", fontsize=10, fontname="helv")
        p2.insert_text((50, 195), "Failure to provide timely notice results in automatic month-to-month lease renewal.", fontsize=10, fontname="helv")

        p2.insert_text((50, 235), "5. MAINTENANCE AND REPAIRS", fontsize=12, fontname="helv")
        p2.insert_text((50, 260), "Tenant is responsible for keeping the premises clean and reporting plumbing leaks immediately.", fontsize=10, fontname="helv")
        p2.insert_text((50, 285), "Landlord shall perform heating and electrical repairs within 48 hours of notice.", fontsize=10, fontname="helv")
        p2.insert_text((50, 310), "Unauthorized modifications or wall painting are strictly prohibited without prior written consent.", fontsize=10, fontname="helv")

        p2.insert_text((50, 350), "6. PET POLICY AND SPECIAL CONDITIONS", fontsize=12, fontname="helv")
        p2.insert_text((50, 375), "Pets are allowed subject to a one-time non-refundable pet deposit of $350.00.", fontsize=10, fontname="helv")
        p2.insert_text((50, 400), "Subleasing the apartment via short-term rental platforms like Airbnb is strictly prohibited.", fontsize=10, fontname="helv")
        p2.insert_text((50, 425), "Smoking is not permitted anywhere inside the residential building.", fontsize=10, fontname="helv")

        doc.save(str(lease_path))
        doc.close()

    # 3. Bank Overdue Notice
    bank_path = SAMPLES_DIR / "sample_bank_overdue_notice.pdf"
    if not bank_path.exists():
        doc = fitz.open()
        p = doc.new_page(width=595, height=842)
        p.insert_text((50, 60), "FIRST NATIONAL BANK — CREDIT SERVICES", fontsize=16, fontname="helv", color=(0.7, 0.1, 0.1))
        p.insert_text((50, 85), "URGENT: Notice of Delinquent Balance & Demand for Payment", fontsize=11, fontname="helv", color=(0.3, 0.3, 0.3))

        p.draw_rect(fitz.Rect(50, 110, 545, 180), color=(0.8, 0.2, 0.2), fill=(1.0, 0.95, 0.95), width=1)
        p.insert_text((70, 135), "Overdue Balance: $642.80 USD", fontsize=14, fontname="helv", color=(0.8, 0.1, 0.1))
        p.insert_text((70, 160), "Final Payment Deadline: November 15, 2026.", fontsize=12, fontname="helv")

        notices = [
            "Your credit card account #5429-XXXX-XXXX-8910 is currently 45 days past due.",
            "You must pay the past due balance of $642.80 immediately to prevent credit bureau reporting.",
            "A delinquent finance fee of $39.00 has been added to your current statement balance.",
            "Failure to resolve this balance by November 15, 2026 will result in account cancellation and referral to collection agencies.",
            "To establish a hardship payment arrangement, call customer service at 1-800-555-0199.",
            "Interest will continue to accrue at the default penalty APR of 29.99% per annum."
        ]
        y = 210
        for n in notices:
            p.insert_text((50, y), f"• {n}", fontsize=10, fontname="helv")
            y += 35

        doc.save(str(bank_path))
        doc.close()
