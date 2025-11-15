"""
Test client for DS Chat backend - tests the API endpoints.
Run this to verify the backend is working correctly.
"""

from __future__ import annotations

import asyncio
import json
import sys
from typing import Any

import httpx


class DSChatTestClient:
    """Test client for DS Chat API."""

    def __init__(self, base_url: str = "http://localhost:8000"):
        """Initialize test client."""
        self.base_url = base_url
        self.session_id: str | None = None

    async def health_check(self) -> bool:
        """Check if backend is healthy."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/health")
                response.raise_for_status()
                data = response.json()
                print(f"✓ Health check passed")
                print(f"  - Status: {data['status']}")
                print(f"  - Agent initialized: {data['agent_initialized']}")
                return data["agent_initialized"]
        except Exception as e:
            print(f"✗ Health check failed: {e}")
            return False

    async def create_session(self) -> str:
        """Create a new session."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(f"{self.base_url}/api/sessions")
                response.raise_for_status()
                data = response.json()
                self.session_id = data["session_id"]
                print(f"✓ Created session: {self.session_id}")
                return self.session_id
        except Exception as e:
            print(f"✗ Failed to create session: {e}")
            raise

    async def list_sessions(self) -> list[dict[str, Any]]:
        """List all sessions."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/sessions")
                response.raise_for_status()
                data = response.json()
                sessions = data["sessions"]
                print(f"✓ Listed {len(sessions)} session(s)")
                for s in sessions:
                    print(
                        f"  - {s['session_id']}: "
                        f"{s['message_count']} messages, "
                        f"updated {s['updated_at']}"
                    )
                return sessions
        except Exception as e:
            print(f"✗ Failed to list sessions: {e}")
            return []

    async def chat(self, message: str) -> tuple[str, dict[str, Any]] | None:
        """Send a chat message."""
        if not self.session_id:
            await self.create_session()

        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                print(f"\n→ Sending: {message}")
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={"session_id": self.session_id, "message": message},
                )
                response.raise_for_status()
                data = response.json()

                print(f"✓ Got response")
                print(f"  - Text: {data['response'][:200]}..." if len(data['response']) > 200 else f"  - Text: {data['response']}")
                print(f"  - Tools: {data['tools']}")
                print(f"  - Tokens: {data['tokens']}")
                print(f"  - Time: {data['time_ms']:.1f}ms")

                return data["response"], data

        except httpx.HTTPError as e:
            print(f"✗ Chat failed: {e}")
            if hasattr(e, "response") and e.response:
                try:
                    error_detail = e.response.json()
                    print(f"  Error detail: {error_detail}")
                except:
                    pass
            return None
        except Exception as e:
            print(f"✗ Unexpected error: {e}")
            return None

    async def delete_session(self, session_id: str | None = None) -> bool:
        """Delete a session."""
        session_id = session_id or self.session_id
        if not session_id:
            print("✗ No session to delete")
            return False

        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(f"{self.base_url}/api/sessions/{session_id}")
                response.raise_for_status()
                print(f"✓ Deleted session: {session_id}")
                if self.session_id == session_id:
                    self.session_id = None
                return True
        except Exception as e:
            print(f"✗ Failed to delete session: {e}")
            return False


async def test_basic_flow():
    """Test basic backend flow."""
    print("\n" + "=" * 60)
    print("DS Chat Backend - Basic Flow Test")
    print("=" * 60)

    client = DSChatTestClient()

    # 1. Health check
    print("\n[1/4] Health Check")
    if not await client.health_check():
        print("\n✗ Backend is not ready. Make sure it's running on http://localhost:8000")
        return False

    # 2. Create session
    print("\n[2/4] Create Session")
    try:
        await client.create_session()
    except Exception as e:
        print(f"✗ Failed: {e}")
        return False

    # 3. Send a simple message
    print("\n[3/4] Send Chat Message")
    result = await client.chat("Hello! What can you help me with?")
    if not result:
        return False

    # 4. List sessions
    print("\n[4/4] List Sessions")
    await client.list_sessions()

    print("\n" + "=" * 60)
    print("✓ Basic flow test passed!")
    print("=" * 60)
    return True


async def test_multi_turn():
    """Test multi-turn conversation."""
    print("\n" + "=" * 60)
    print("DS Chat Backend - Multi-Turn Conversation Test")
    print("=" * 60)

    client = DSChatTestClient()

    # Health check
    if not await client.health_check():
        print("\n✗ Backend is not ready")
        return False

    # Create session
    print("\n[1/3] Create Session")
    await client.create_session()

    # First turn
    print("\n[2/3] First Message")
    result1 = await client.chat("Show me the top issues for provider QL2")
    if not result1:
        print("✗ First message failed")
        return False

    # Second turn (should use same session)
    print("\n[3/3] Second Message (multi-turn)")
    result2 = await client.chat("What about QF provider?")
    if not result2:
        print("✗ Second message failed")
        return False

    print("\n" + "=" * 60)
    print("✓ Multi-turn test passed!")
    print("=" * 60)
    return True


async def main():
    """Run tests."""
    import sys

    if len(sys.argv) > 1:
        test_type = sys.argv[1]
    else:
        test_type = "basic"

    print("\n[*] Starting test client...")
    print(f"[*] Base URL: http://localhost:8000")
    print(f"[*] Test type: {test_type}")

    try:
        if test_type == "basic":
            success = await test_basic_flow()
        elif test_type == "multi":
            success = await test_multi_turn()
        else:
            print(f"✗ Unknown test type: {test_type}")
            print("Usage: python test_client.py [basic|multi]")
            return 1

        return 0 if success else 1

    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        return 1
    except Exception as e:
        print(f"\n✗ Fatal error: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
