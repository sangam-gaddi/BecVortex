"""
BEC BillDesk Voice Agent Functions

Callable functions that the AI agent can invoke to interact with the
BEC BillDesk application. These functions send action messages to the
frontend via LiveKit data channels.
"""

from typing import Optional
import json
from livekit import rtc

# Fee structure data (mirrors lib/data/feeStructure.ts)
FEE_STRUCTURE = [
    {
        "id": "tuition",
        "name": "Tuition Fee",
        "total": 75000,
        "dueDate": "2025-01-30",
        "status": "pending",
        "breakdown": [
            {"category": "Course Fee", "amount": 50000},
            {"category": "Lab Fee", "amount": 15000},
            {"category": "Library Fee", "amount": 5000},
            {"category": "Sports Fee", "amount": 5000},
        ]
    },
    {
        "id": "development",
        "name": "Development Fee",
        "total": 15000,
        "dueDate": "2025-01-30",
        "status": "pending",
        "breakdown": [
            {"category": "Infrastructure", "amount": 8000},
            {"category": "Technology Upgrade", "amount": 5000},
            {"category": "Green Campus", "amount": 2000},
        ]
    },
    {
        "id": "hostel",
        "name": "Hostel Fee",
        "total": 45000,
        "dueDate": "2025-02-15",
        "status": "pending",
        "breakdown": [
            {"category": "Accommodation", "amount": 25000},
            {"category": "Mess Charges", "amount": 15000},
            {"category": "Maintenance", "amount": 3000},
            {"category": "Security Deposit", "amount": 2000},
        ]
    },
    {
        "id": "examination",
        "name": "Examination Fee",
        "total": 5000,
        "dueDate": "2025-02-28",
        "status": "pending",
        "breakdown": [
            {"category": "Registration", "amount": 2000},
            {"category": "Valuation", "amount": 2000},
            {"category": "Certificate", "amount": 1000},
        ]
    }
]


class BillDeskFunctions:
    """Functions for interacting with BEC BillDesk"""
    
    def __init__(self, room: rtc.Room):
        self.room = room
        self.selected_fees: list[str] = []
        self.current_payment_method: str = "crypto"
        self.wallet_connected: bool = False
    
    async def _send_action(self, action_type: str, payload: dict = None):
        """Send an action to the frontend via data channel"""
        message = {
            "type": "VOICE_ACTION",
            "action": action_type,
            "payload": payload or {}
        }
        data = json.dumps(message).encode('utf-8')
        await self.room.local_participant.publish_data(data, reliable=True)
    
    def get_pending_fees(self) -> str:
        """Get list of all pending fees with amounts"""
        pending = [f for f in FEE_STRUCTURE if f["status"] == "pending"]
        
        if not pending:
            return "Great news! You have no pending fees. All your fees have been paid."
        
        total = sum(f["total"] for f in pending)
        fee_list = ", ".join([f'{f["name"]} of ₹{f["total"]:,}' for f in pending])
        
        return f"You have {len(pending)} pending fees: {fee_list}. The total pending amount is ₹{total:,}."
    
    def get_fee_details(self, fee_name: str) -> str:
        """Get detailed breakdown of a specific fee"""
        fee_name_lower = fee_name.lower()
        
        for fee in FEE_STRUCTURE:
            if fee_name_lower in fee["name"].lower() or fee_name_lower in fee["id"]:
                breakdown = ", ".join([f'{b["category"]}: ₹{b["amount"]:,}' for b in fee["breakdown"]])
                return f"The {fee['name']} is ₹{fee['total']:,} due on {fee['dueDate']}. The breakdown is: {breakdown}."
        
        return f"I couldn't find a fee called '{fee_name}'. Available fees are: Tuition, Development, Hostel, and Examination."
    
    def get_paid_fees(self) -> str:
        """Get list of paid fees"""
        paid = [f for f in FEE_STRUCTURE if f["status"] == "paid"]
        
        if not paid:
            return "You haven't paid any fees yet. Would you like to pay any pending fees?"
        
        total = sum(f["total"] for f in paid)
        fee_list = ", ".join([f['f["name"]'] for f in paid])
        
        return f"You have paid {len(paid)} fees: {fee_list}. The total paid amount is ₹{total:,}."
    
    async def select_fee(self, fee_name: str) -> str:
        """Select a fee for payment"""
        fee_name_lower = fee_name.lower()
        
        for fee in FEE_STRUCTURE:
            if fee_name_lower in fee["name"].lower() or fee_name_lower in fee["id"]:
                if fee["id"] not in self.selected_fees:
                    self.selected_fees.append(fee["id"])
                
                await self._send_action("SELECT_FEE", {"feeId": fee["id"]})
                return f"I've selected the {fee['name']} for payment. The amount is ₹{fee['total']:,}. Would you like to select any other fees or proceed to payment?"
        
        return f"I couldn't find a fee called '{fee_name}'. Available fees are: Tuition, Development, Hostel, and Examination."
    
    async def deselect_fee(self, fee_name: str) -> str:
        """Deselect a fee from payment"""
        fee_name_lower = fee_name.lower()
        
        for fee in FEE_STRUCTURE:
            if fee_name_lower in fee["name"].lower() or fee_name_lower in fee["id"]:
                if fee["id"] in self.selected_fees:
                    self.selected_fees.remove(fee["id"])
                
                await self._send_action("DESELECT_FEE", {"feeId": fee["id"]})
                return f"I've deselected the {fee['name']}."
        
        return f"I couldn't find a fee called '{fee_name}'."
    
    async def select_all_fees(self) -> str:
        """Select all pending fees for payment"""
        pending = [f for f in FEE_STRUCTURE if f["status"] == "pending"]
        
        self.selected_fees = [f["id"] for f in pending]
        
        for fee_id in self.selected_fees:
            await self._send_action("SELECT_FEE", {"feeId": fee_id})
        
        total = sum(f["total"] for f in pending)
        return f"I've selected all {len(pending)} pending fees. The total amount is ₹{total:,}. How would you like to pay? You can choose Crypto, UPI, Net Banking, or Cash."
    
    async def select_payment_method(self, method: str) -> str:
        """Select payment method (crypto, upi, netbanking, cash)"""
        method_lower = method.lower().replace(" ", "")
        valid_methods = {
            "crypto": "crypto",
            "cryptocurrency": "crypto",
            "eth": "crypto",
            "ethereum": "crypto",
            "metamask": "crypto",
            "upi": "upi",
            "netbanking": "netbanking",
            "net banking": "netbanking",
            "bank": "netbanking",
            "cash": "cash"
        }
        
        normalized_method = valid_methods.get(method_lower)
        
        if normalized_method:
            self.current_payment_method = normalized_method
            await self._send_action("SELECT_PAYMENT_METHOD", {"method": normalized_method})
            
            method_names = {"crypto": "Cryptocurrency (Sepolia ETH)", "upi": "UPI", "netbanking": "Net Banking", "cash": "Cash"}
            return f"I've switched to {method_names[normalized_method]}. {'Would you like me to connect your wallet?' if normalized_method == 'crypto' else 'Ready to proceed when you are.'}"
        
        return "I support these payment methods: Crypto, UPI, Net Banking, and Cash. Which one would you prefer?"
    
    async def connect_wallet(self) -> str:
        """Trigger wallet connection (MetaMask, WalletConnect, etc)"""
        if not self.selected_fees:
            return "Please select at least one fee to pay before connecting your wallet."
        
        if self.current_payment_method != "crypto":
            self.current_payment_method = "crypto"
            await self._send_action("SELECT_PAYMENT_METHOD", {"method": "crypto"})
        
        await self._send_action("CONNECT_WALLET", {})
        return "I've opened the wallet connection popup. Please connect your MetaMask or other wallet. You can also scan the QR code with a mobile wallet. Let me know once you're connected."
    
    async def initiate_payment(self) -> str:
        """Initiate the payment transaction"""
        if not self.selected_fees:
            return "Please select at least one fee to pay first."
        
        if self.current_payment_method == "crypto" and not self.wallet_connected:
            await self.connect_wallet()
            return "Please connect your wallet first. I've opened the connection popup for you."
        
        await self._send_action("INITIATE_PAYMENT", {
            "feeIds": self.selected_fees,
            "method": self.current_payment_method
        })
        
        total = sum(f["total"] for f in FEE_STRUCTURE if f["id"] in self.selected_fees)
        
        if self.current_payment_method == "crypto":
            return f"I'm initiating the payment of ₹{total:,} using Sepolia ETH. Please confirm the transaction in your wallet when the popup appears."
        else:
            return f"I'm initiating the payment of ₹{total:,} using {self.current_payment_method.upper()}. Please follow the instructions on screen."
    
    def get_total_selected(self) -> str:
        """Get total amount of selected fees"""
        if not self.selected_fees:
            return "You haven't selected any fees yet. Would you like me to help you select some fees to pay?"
        
        selected = [f for f in FEE_STRUCTURE if f["id"] in self.selected_fees]
        total = sum(f["total"] for f in selected)
        fee_names = ", ".join([f["name"] for f in selected])
        
        return f"You have selected {len(selected)} fees: {fee_names}. The total amount is ₹{total:,}."
    
    def set_wallet_connected(self, connected: bool):
        """Update wallet connection status (called from frontend)"""
        self.wallet_connected = connected


# Function definitions for Gemini function calling
FUNCTION_DEFINITIONS = [
    {
        "name": "get_pending_fees",
        "description": "Get list of all pending fees that the student needs to pay, including amounts and due dates",
        "parameters": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "get_fee_details",
        "description": "Get detailed breakdown of a specific fee (e.g., tuition, hostel, development, examination)",
        "parameters": {
            "type": "object",
            "properties": {
                "fee_name": {
                    "type": "string",
                    "description": "Name of the fee to get details for (tuition, hostel, development, examination)"
                }
            },
            "required": ["fee_name"]
        }
    },
    {
        "name": "get_paid_fees",
        "description": "Get list of fees that have already been paid by the student",
        "parameters": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "select_fee",
        "description": "Select a specific fee for payment by clicking its checkbox in the UI",
        "parameters": {
            "type": "object",
            "properties": {
                "fee_name": {
                    "type": "string",
                    "description": "Name of the fee to select (tuition, hostel, development, examination)"
                }
            },
            "required": ["fee_name"]
        }
    },
    {
        "name": "deselect_fee",
        "description": "Deselect a fee that was previously selected for payment",
        "parameters": {
            "type": "object",
            "properties": {
                "fee_name": {
                    "type": "string",
                    "description": "Name of the fee to deselect"
                }
            },
            "required": ["fee_name"]
        }
    },
    {
        "name": "select_all_fees",
        "description": "Select all pending fees at once for batch payment",
        "parameters": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "select_payment_method",
        "description": "Switch to a specific payment method (crypto, upi, netbanking, cash)",
        "parameters": {
            "type": "object",
            "properties": {
                "method": {
                    "type": "string",
                    "description": "Payment method to use: 'crypto' for cryptocurrency/MetaMask, 'upi' for UPI, 'netbanking' for Net Banking, 'cash' for Cash payment"
                }
            },
            "required": ["method"]
        }
    },
    {
        "name": "connect_wallet",
        "description": "Open the wallet connection popup to connect MetaMask or other crypto wallets for payment",
        "parameters": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "initiate_payment",
        "description": "Start the payment process for selected fees. For crypto, this sends the transaction to the wallet for confirmation.",
        "parameters": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "get_total_selected",
        "description": "Get the total amount of currently selected fees",
        "parameters": {"type": "object", "properties": {}, "required": []}
    }
]
