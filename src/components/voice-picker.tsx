import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SPEECH_VOICES, resolveSpeechVoice, useSpeechVoice } from '@/lib/speech-voice';
import { VoiceSamples } from './voice-samples';

/** These voices synthesize new replies through the turn-based speech flow. */
export function VoicePicker({ disabled = false, label = 'Voice' }: { disabled?: boolean; label?: string }) {
  const [choice, setChoice] = useSpeechVoice();
  return <div className="w-full space-y-3">
    <Select value={choice} disabled={disabled} onValueChange={value => {
      const valid = resolveSpeechVoice(value);
      if (valid) setChoice(valid);
    }}>
      <SelectTrigger aria-label={label} className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectGroup><SelectLabel>Hindi/Hinglish · spoken answers</SelectLabel>{SPEECH_VOICES.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectGroup>
      </SelectContent>
    </Select>
    <VoiceSamples key={choice} disabled={disabled} sampleId={choice.toLowerCase()} />
  </div>;
}