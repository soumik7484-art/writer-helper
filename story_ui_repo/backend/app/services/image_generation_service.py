"""
Image Generation Service
Integration point for AI image generation APIs (Stable Diffusion, DALL-E, etc.)
Provides manga-style panel illustrations for storyboard
"""
import os
import httpx
from typing import Optional, Dict, Any
from ..config import BASE_DIR


class ImageGenerationService:
    """
    Handles image generation for storyboard panels
    Supports multiple backends with graceful fallbacks
    """
    
    def __init__(self):
        # Configuration - can be set via environment variables
        self.stable_diffusion_api_key = os.getenv("STABLE_DIFFUSION_API_KEY", "")
        self.stable_diffusion_url = os.getenv("STABLE_DIFFUSION_URL", "")
        self.dalle_api_key = os.getenv("OPENAI_API_KEY", "")
        self.enabled = os.getenv("IMAGE_GENERATION_ENABLED", "false").lower() == "true"
        
        # Placeholder service URLs
        self.placeholder_service = "https://placehold.co"
        
        # Style presets for manga-style illustrations
        self.manga_style_suffix = ", manga style, black and white line art, high contrast, detailed shading, cinematic composition, professional comic book illustration"
    
    def generate_panel_illustration(
        self,
        prompt: str,
        panel_id: str,
        style: str = "manga",
        width: int = 512,
        height: int = 384
    ) -> Dict[str, Any]:
        """
        Generate an illustration for a storyboard panel
        
        Args:
            prompt: Description of the scene to illustrate
            panel_id: Unique panel identifier
            style: Visual style (manga, realistic, sketch, etc.)
            width: Image width in pixels
            height: Image height in pixels
            
        Returns:
            Dictionary with image_url, generation_method, and metadata
        """
        if not self.enabled:
            return self._generate_placeholder(panel_id, width, height, "Generation disabled")
        
        # Try Stable Diffusion first
        if self.stable_diffusion_api_key and self.stable_diffusion_url:
            result = self._generate_stable_diffusion(prompt, style, width, height)
            if result:
                return result
        
        # Try DALL-E as fallback
        if self.dalle_api_key:
            result = self._generate_dalle(prompt, style, width, height)
            if result:
                return result
        
        # Return placeholder if all methods fail
        return self._generate_placeholder(panel_id, width, height, "No API configured")
    
    def _generate_stable_diffusion(
        self,
        prompt: str,
        style: str,
        width: int,
        height: int
    ) -> Optional[Dict[str, Any]]:
        """
        Generate image using Stable Diffusion API
        Supports various SD API formats (Automatic1111, Replicate, etc.)
        """
        try:
            # Apply style modifications
            full_prompt = prompt
            if style == "manga":
                full_prompt += self.manga_style_suffix
            
            # Example for Automatic1111 WebUI API
            payload = {
                "prompt": full_prompt,
                "negative_prompt": "color, photograph, 3d render, blurry, low quality",
                "width": width,
                "height": height,
                "steps": 20,
                "cfg_scale": 7,
                "sampler_name": "DPM++ 2M Karras",
                "n_iter": 1,
                "batch_size": 1
            }
            
            headers = {"Content-Type": "application/json"}
            if self.stable_diffusion_api_key:
                headers["Authorization"] = f"Bearer {self.stable_diffusion_api_key}"
            
            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    f"{self.stable_diffusion_url}/sdapi/v1/txt2img",
                    json=payload,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    # Extract first generated image (base64 or URL depending on API)
                    if "images" in data and data["images"]:
                        image_data = data["images"][0]
                        # Store or convert base64 to URL here
                        return {
                            "image_url": f"data:image/png;base64,{image_data}",
                            "generation_method": "stable_diffusion",
                            "prompt_used": full_prompt,
                            "width": width,
                            "height": height
                        }
        except Exception as e:
            print(f"[Stable Diffusion Generation Error] {e}")
        
        return None
    
    def _generate_dalle(
        self,
        prompt: str,
        style: str,
        width: int,
        height: int
    ) -> Optional[Dict[str, Any]]:
        """
        Generate image using OpenAI DALL-E API
        """
        try:
            import openai
            
            # Apply style modifications
            full_prompt = prompt
            if style == "manga":
                full_prompt = f"Manga-style black and white illustration: {prompt}"
            
            openai.api_key = self.dalle_api_key
            
            # DALL-E only supports specific sizes
            size = "1024x1024"
            if width <= 256 and height <= 256:
                size = "256x256"
            elif width <= 512 and height <= 512:
                size = "512x512"
            
            response = openai.Image.create(
                prompt=full_prompt[:1000],  # DALL-E has prompt length limit
                n=1,
                size=size
            )
            
            if response and response.data:
                image_url = response.data[0].url
                return {
                    "image_url": image_url,
                    "generation_method": "dalle",
                    "prompt_used": full_prompt,
                    "width": width,
                    "height": height
                }
        except ImportError:
            print("[DALL-E Generation] openai package not installed")
        except Exception as e:
            print(f"[DALL-E Generation Error] {e}")
        
        return None
    
    def _generate_placeholder(
        self,
        panel_id: str,
        width: int,
        height: int,
        reason: str = "Placeholder"
    ) -> Dict[str, Any]:
        """
        Generate a placeholder image when real generation isn't available
        Uses placehold.co or similar service
        """
        # Create descriptive placeholder
        text = f"Panel+{panel_id.split('_')[-1] if '_' in panel_id else panel_id}"
        placeholder_url = f"{self.placeholder_service}/{width}x{height}/1C1713/C49A61?text={text}"
        
        return {
            "image_url": placeholder_url,
            "generation_method": "placeholder",
            "prompt_used": "",
            "width": width,
            "height": height,
            "placeholder_reason": reason
        }
    
    def generate_character_reference(
        self,
        character_name: str,
        physical_description: str,
        genre: str = "Mystery"
    ) -> Dict[str, Any]:
        """
        Generate a consistent character reference image
        Used for tracking visual consistency across panels
        """
        prompt = f"Character reference sheet, {genre} genre. {character_name}: {physical_description}. Multiple angles, detailed features, manga style."
        
        return self.generate_panel_illustration(
            prompt=prompt,
            panel_id=f"char_ref_{character_name.lower().replace(' ', '_')}",
            style="manga",
            width=512,
            height=768
        )
    
    def batch_generate(
        self,
        panels: list,
        progress_callback=None
    ) -> Dict[str, Dict[str, Any]]:
        """
        Generate illustrations for multiple panels
        
        Args:
            panels: List of panel dictionaries with id and illustration_prompt
            progress_callback: Optional function to report progress
            
        Returns:
            Dictionary mapping panel_id to generation result
        """
        results = {}
        total = len(panels)
        
        for idx, panel in enumerate(panels):
            panel_id = panel.get('id', f'panel_{idx}')
            prompt = panel.get('illustration_prompt', '')
            
            if not prompt:
                # Generate from visual description
                prompt = panel.get('visual_description', 'Story scene')
            
            result = self.generate_panel_illustration(
                prompt=prompt,
                panel_id=panel_id,
                style="manga",
                width=512,
                height=384
            )
            
            results[panel_id] = result
            
            if progress_callback:
                progress_callback(idx + 1, total, panel_id)
        
        return results


# Global service instance
image_generation_service = ImageGenerationService()
